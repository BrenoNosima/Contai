"""Request-scoped execution limits shared by the supervisor and specialists."""

import logging
import json
from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass, field
from threading import Lock, BoundedSemaphore
from time import monotonic
from uuid import uuid4

from groq import APIConnectionError, InternalServerError
from langchain.agents.middleware import AgentMiddleware
from pydantic import ValidationError

from app.core.config import SETTINGS
from app.core.request_context import request_id

logger = logging.getLogger(__name__)


class AgentUnavailableError(RuntimeError):
    """The model did not produce a usable answer."""


class AgentBudgetExceeded(TimeoutError):
    """The request exhausted its shared time or model-call budget."""


class AgentBusyError(RuntimeError):
    pass


_slots = BoundedSemaphore(3)


@contextmanager
def ai_slot():
    if not _slots.acquire(blocking=False):
        raise AgentBusyError("Assistente ocupado.")
    try:
        yield
    finally:
        _slots.release()


@dataclass
class ExecutionBudget:
    deadline: float
    request_id: str = field(default_factory=lambda: request_id.get() or uuid4().hex)
    calls: int = 0
    retries: int = 0
    lock: Lock = field(default_factory=Lock)

    def remaining(self):
        remaining = self.deadline - monotonic()
        if remaining <= 0:
            raise AgentBudgetExceeded("O assistente excedeu o tempo de resposta.")
        return remaining


_budget: ContextVar[ExecutionBudget | None] = ContextVar("ai_execution_budget", default=None)


@contextmanager
def execution_scope():
    if _budget.get() is not None:
        yield _budget.get()
        return
    start = monotonic()
    budget = ExecutionBudget(start + SETTINGS.ai_request_timeout_seconds)
    token = _budget.set(budget)
    try:
        yield budget
    finally:
        logger.info("ai_request request_id=%s duration_ms=%d model_calls=%d retries=%d",
                    budget.request_id, (monotonic() - start) * 1000, budget.calls, budget.retries)
        _budget.reset(token)


class ExecutionLimits(AgentMiddleware):
    def wrap_model_call(self, request, handler):
        with execution_scope() as budget:
            while True:
                with budget.lock:
                    remaining = budget.remaining()
                    if budget.calls >= SETTINGS.ai_max_model_calls:
                        raise AgentBudgetExceeded("O assistente excedeu o limite de etapas.")
                    budget.calls += 1
                start = monotonic()
                try:
                    # Groq accepts a per-request timeout. SDK retries are disabled
                    # so a retry cannot silently multiply this time allowance.
                    result = handler(request.override(model_settings={
                        **request.model_settings,
                        "timeout": min(SETTINGS.ai_timeout_seconds, remaining),
                    }))
                    budget.remaining()
                    return result
                except (APIConnectionError, InternalServerError):
                    with budget.lock:
                        if budget.retries >= SETTINGS.ai_max_retries:
                            raise
                        budget.remaining()
                        budget.retries += 1
                finally:
                    logger.info("ai_model request_id=%s duration_ms=%d",
                                budget.request_id, (monotonic() - start) * 1000)

    def wrap_tool_call(self, request, handler):
        with execution_scope() as budget:
            budget.remaining()
            start = monotonic()
            try:
                result = handler(request)
                budget.remaining()
                return result
            finally:
                logger.info("ai_tool request_id=%s tool=%s duration_ms=%d",
                            budget.request_id, request.tool_call["name"],
                            (monotonic() - start) * 1000)


def final_text(result):
    messages = result.get("messages") or []
    content = getattr(messages[-1], "content", None) if messages else None
    if not isinstance(content, str) or not content.strip():
        raise AgentUnavailableError("O assistente retornou resposta vazia ou inválida.")
    if getattr(messages[-1], "type", None) == "tool":
        try:
            data = json.loads(content)
        except (ValueError, TypeError):
            data = None
        if isinstance(data, dict) and data.get("requires_confirmation") is True:
            return "Preparei a proposta. Revise os dados e confirme abaixo para aplicar a alteração."
        if isinstance(data, dict) and isinstance(data.get("error"), str):
            return data["error"]
    return content


def invoke_once(graph, payload, config):
    try:
        return graph.invoke(payload, config=config)
    except (ValueError, ValidationError) as error:
        # A graph may already have executed a proposal tool. Never replay it.
        raise AgentUnavailableError("O assistente não conseguiu concluir a resposta.") from error


def recent_history(history, max_messages=20, max_characters=16000):
    """Keep whole recent messages; never truncate a financial value mid-message."""
    selected = []
    size = 0
    for item in reversed(history or []):
        length = len(str(item.get("content", "")))
        if len(selected) >= max_messages or size + length > max_characters:
            break
        selected.append(item)
        size += length
    return list(reversed(selected))
