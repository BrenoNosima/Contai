"""Exact, self-contained read queries that do not need an LLM."""

import re
import unicodedata
from calendar import monthrange
from datetime import datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from app.services.report_service import ReportService
from app.services.transaction_service import TransactionService


def money(value):
    return "R$ " + f"{Decimal(str(value)):,.2f}".translate(str.maketrans({",": ".", ".": ","}))


def quick_answer(message, db):
    normalized = unicodedata.normalize("NFKD", message.casefold())
    normalized = "".join(c for c in normalized if not unicodedata.combining(c))
    normalized = re.sub(r"\s+", " ", normalized).strip().rstrip("?.!").strip()
    if normalized in {"qual meu saldo", "qual e meu saldo", "qual e o meu saldo", "qual meu saldo atual", "qual e meu saldo atual", "quanto tenho"}:
        income, expense = TransactionService().get_totals(db)
        return f"Seu saldo atual é {money(income - expense)}, considerando receitas e despesas pagas do histórico."
    match = re.fullmatch(r"quanto (gastei|recebi|sobrou) (este mes|esse mes|no mes atual|mes passado|no mes passado)", normalized)
    if not match:
        return None
    today = datetime.now(ZoneInfo("America/Sao_Paulo")).date()
    start = today.replace(day=1)
    if "passado" in match[2]:
        start = (start - timedelta(days=1)).replace(day=1)
    end = start.replace(day=monthrange(start.year, start.month)[1])
    result = ReportService().get_period_summary(db, start, end)
    key, label = {
        "gastei": ("total_expenses", "Despesas pagas"),
        "recebi": ("total_income", "Receitas pagas"),
        "sobrou": ("balance", "Saldo realizado"),
    }[match[1]]
    return (f"{label} de {start:%d/%m/%Y} a {end:%d/%m/%Y}: {money(result[key])}. "
            "O período considera a data de vencimento dos lançamentos pagos.")
