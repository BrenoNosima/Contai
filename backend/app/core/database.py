from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker, with_loader_criteria
from sqlalchemy.orm import declarative_base

from app.core.config import DATABASE_URL

# SQLite só é usado como fallback local (ex: rodar sem Docker/Postgres
# à mão); em produção/desenvolvimento normal, DATABASE_URL aponta para
# PostgreSQL — ver docker-compose.yml e .env.example.
connect_args = (
    {"check_same_thread": False}
    if DATABASE_URL.startswith("sqlite")
    else {}
)

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


@event.listens_for(Session, "do_orm_execute")
def scope_financial_queries(execute_state):
    """Impede que consultas autenticadas atravessem a fronteira do usuário."""
    from app.core.user_context import get_current_user_id
    from app.models.fixed_expense import FixedExpense
    from app.models.goal import Goal
    from app.models.transaction import Transaction
    from app.models.assistant_action import AssistantAction

    user_id = execute_state.session.info.get("user_id") or get_current_user_id()
    if user_id is None or not execute_state.is_select:
        return
    for model in (Transaction, Goal, FixedExpense, AssistantAction):
        execute_state.statement = execute_state.statement.options(
            with_loader_criteria(
                model,
                lambda entity: entity.user_id == user_id,
                include_aliases=True,
            )
        )


@event.listens_for(Session, "before_flush")
def assign_financial_owner(session, _flush_context, _instances):
    from app.core.user_context import get_current_user_id
    from app.models.fixed_expense import FixedExpense
    from app.models.goal import Goal
    from app.models.transaction import Transaction
    from app.models.assistant_action import AssistantAction

    user_id = session.info.get("user_id") or get_current_user_id()
    if user_id is None:
        return
    for entity in session.new:
        if isinstance(entity, (Transaction, Goal, FixedExpense, AssistantAction)):
            entity.user_id = user_id
