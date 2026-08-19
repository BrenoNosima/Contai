from datetime import date
from typing import Annotated, Literal, Optional

from langchain_core.tools import tool
from pydantic import Field

from app.core.database import SessionLocal

from app.schemas.transaction import TransactionCreate
from app.schemas.goal import GoalCreate
from app.schemas.fixed_expense import FixedExpenseCreate

from app.services.transaction_service import TransactionService
from app.services.goal_service import GoalService
from app.services.fixed_expense_service import FixedExpenseService
from app.services.dashboard_service import DashboardService
from app.services.report_service import ReportService

# Instâncias únicas dos services. Cada tool abre e fecha sua própria
# sessão de banco (SessionLocal), então isso é seguro de compartilhar.
transaction_service = TransactionService()
goal_service = GoalService()
fixed_expense_service = FixedExpenseService()
dashboard_service = DashboardService()
report_service = ReportService()


def _parse_iso_date(value: Optional[str], field_name: str) -> date | dict | None:
    if not value:
        return None

    try:
        return date.fromisoformat(value)
    except ValueError:
        return {
            "error": (
                f"Data inválida em {field_name}: {value!r}. "
                "Use o formato AAAA-MM-DD, por exemplo 2026-08-20."
            )
        }


@tool
def create_transaction(
    type: Literal["income", "expense"],
    description: Annotated[str, Field(min_length=1, max_length=255)],
    category: Annotated[str, Field(min_length=1, max_length=100)],
    amount: Annotated[float, Field(gt=0)],
    priority: Literal["essential", "desirable", "superfluous"] | None = None,
    due_date: Optional[str] = None,
    is_recurring: bool = False,
    recurrence: Literal["weekly", "monthly"] | None = None,
) -> dict:
    """
    Cria uma nova transação financeira (receita ou despesa) e salva no banco de dados.

    Args:
        type: "income" para receita ou "expense" para despesa.
        description: descrição curta da transação.
        category: categoria (ex: Alimentação, Transporte, Salário, Lazer).
        amount: valor numérico da transação (sempre positivo).
        priority: para despesas, use "essential", "desirable" ou "superfluous".
            Deixe em branco para receitas.
        due_date: data de vencimento/competência no formato "AAAA-MM-DD".
            Se omitido, usa a data de hoje. Datas futuras entram como
            "pendente" automaticamente.
        is_recurring: True se isso deve se repetir automaticamente
            (ex: uma assinatura mensal lançada pelo chat).
        recurrence: "weekly" ou "monthly" — obrigatório se is_recurring=True.
    """
    db = SessionLocal()

    try:
        parsed_due_date = _parse_iso_date(due_date, "due_date")
        if isinstance(parsed_due_date, dict):
            return parsed_due_date

        transaction_data = TransactionCreate(
            type=type,
            description=description,
            category=category,
            amount=amount,
            priority=priority,
            source="ai",
            due_date=parsed_due_date,
            is_recurring=is_recurring,
            recurrence=recurrence,
        )

        transaction = transaction_service.create_transaction(
            db=db,
            transaction_data=transaction_data,
        )

        return {
            "id": transaction.id,
            "type": transaction.type,
            "description": transaction.description,
            "category": transaction.category,
            "amount": transaction.amount,
            "priority": transaction.priority,
            "due_date": str(transaction.due_date),
            "status": transaction.status,
            "is_recurring": transaction.is_recurring,
            "recurrence": transaction.recurrence,
        }

    finally:
        db.close()


@tool
def mark_transaction_status(
    transaction_id: Annotated[int, Field(ge=1)],
    status: Literal["paid", "pending"],
) -> dict:
    """
    Marca uma transação existente como paga ou pendente.

    Args:
        transaction_id: id da transação (obtido via search_transactions
            ou list_recent_transactions).
        status: "paid" ou "pending".
    """
    db = SessionLocal()

    try:
        transaction = transaction_service.update_status(
            db,
            transaction_id,
            status,
        )

        if not transaction:
            return {"error": "Transação não encontrada."}

        return {
            "id": transaction.id,
            "description": transaction.description,
            "status": transaction.status,
        }

    finally:
        db.close()


@tool
def search_transactions(
    type: Literal["income", "expense"] | None = None,
    category: Annotated[str | None, Field(max_length=100)] = None,
    status: Literal["paid", "pending"] | None = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> list:
    """
    Busca transações com filtros — use para perguntas como "quais contas
    estão pendentes", "o que eu gastei com Alimentação em agosto" etc.

    Args:
        type: "income" ou "expense" (opcional).
        category: categoria exata (opcional).
        status: "paid" ou "pending" (opcional).
        start_date: data inicial "AAAA-MM-DD" (opcional).
        end_date: data final "AAAA-MM-DD" (opcional).
    """
    db = SessionLocal()

    try:
        parsed_start_date = _parse_iso_date(start_date, "start_date")
        if isinstance(parsed_start_date, dict):
            return [parsed_start_date]

        parsed_end_date = _parse_iso_date(end_date, "end_date")
        if isinstance(parsed_end_date, dict):
            return [parsed_end_date]

        transactions = transaction_service.list_transactions(
            db,
            type=type,
            category=category,
            status=status,
            start_date=parsed_start_date,
            end_date=parsed_end_date,
        )

        return [
            {
                "id": t.id,
                "type": t.type,
                "description": t.description,
                "category": t.category,
                "amount": t.amount,
                "due_date": str(t.due_date),
                "status": t.status,
            }
            for t in transactions
        ]

    finally:
        db.close()


@tool
def generate_recurring_occurrences(
    months_ahead: Annotated[int, Field(ge=1, le=12)] = 3,
) -> list:
    """
    Gera (se ainda não existirem) as próximas cobranças pendentes de
    todas as transações recorrentes, alguns meses à frente. Use quando o
    usuário pedir para "atualizar" ou "projetar" as próximas cobranças.

    Args:
        months_ahead: quantos meses à frente projetar (padrão 3).
    """
    db = SessionLocal()

    try:
        created = transaction_service.generate_recurring_occurrences(
            db,
            months_ahead=months_ahead,
        )

        return [
            {
                "id": t.id,
                "description": t.description,
                "amount": t.amount,
                "due_date": str(t.due_date),
            }
            for t in created
        ]

    finally:
        db.close()


@tool
def get_balance() -> dict:
    """
    Retorna o saldo financeiro atual: total de receitas, total de despesas
    e o saldo (receitas - despesas). Use sempre que o usuário perguntar
    sobre saldo, quanto tem sobrando, ou situação financeira geral.
    """
    db = SessionLocal()

    try:
        total_income = transaction_service.repository.get_total_income(db)
        total_expense = transaction_service.repository.get_total_expense(db)

        return {
            "total_income": total_income,
            "total_expense": total_expense,
            "balance": total_income - total_expense,
        }

    finally:
        db.close()


@tool
def list_recent_transactions(
    limit: Annotated[int, Field(ge=1, le=100)] = 5,
) -> list:
    """
    Lista as transações mais recentes cadastradas no banco de dados.

    Args:
        limit: quantidade máxima de transações a retornar (padrão 5).
    """
    db = SessionLocal()

    try:
        transactions = transaction_service.repository.get_recent_transactions(
            db,
            limit,
        )

        return [
            {
                "id": transaction.id,
                "type": transaction.type,
                "description": transaction.description,
                "category": transaction.category,
                "amount": transaction.amount,
                "status": transaction.status,
            }
            for transaction in transactions
        ]

    finally:
        db.close()


@tool
def get_expenses_by_category() -> list:
    """
    Retorna o total de despesas agrupado por categoria (histórico
    completo). Use quando o usuário quiser saber onde está gastando mais
    no geral. Para um mês específico, use get_category_breakdown.
    """
    db = SessionLocal()

    try:
        categories = transaction_service.repository.get_expenses_by_category(db)

        return [
            {
                "category": category,
                "amount": total,
            }
            for category, total in categories
        ]

    finally:
        db.close()


@tool
def get_monthly_report(
    months: Annotated[int, Field(ge=1, le=24)] = 6,
) -> list:
    """
    Retorna receitas vs. despesas mês a mês (os últimos N meses), com
    saldo calculado. Use para perguntas sobre tendência, evolução ou
    comparação entre meses.

    Args:
        months: quantidade de meses para trás (padrão 6).
    """
    db = SessionLocal()

    try:
        return report_service.monthly_balance_table(db, months=months)

    finally:
        db.close()


@tool
def get_category_breakdown(
    month: Annotated[int | None, Field(ge=1, le=12)] = None,
    year: Annotated[int | None, Field(ge=2000, le=2100)] = None,
) -> dict:
    """
    Retorna o total por categoria (receitas e despesas separadas) dentro
    de um mês/ano específico. Se omitido, usa o mês atual.

    Args:
        month: mês (1-12), opcional.
        year: ano (ex: 2026), opcional.
    """
    db = SessionLocal()

    try:
        return report_service.category_breakdown(db, month=month, year=year)

    finally:
        db.close()


@tool
def create_goal(
    name: Annotated[str, Field(min_length=1, max_length=150)],
    target_amount: Annotated[float, Field(gt=0)],
    current_amount: Annotated[float, Field(ge=0)] = 0.0,
    description: Annotated[str | None, Field(max_length=300)] = None,
    deadline: Optional[str] = None,
) -> dict:
    """
    Cria uma nova meta financeira e salva no banco de dados.

    Args:
        name: nome da meta (ex: "Viagem para a praia", "Reserva de emergência").
        target_amount: valor total que se deseja alcançar.
        current_amount: valor já guardado até o momento (padrão 0).
        description: descrição opcional da meta.
        deadline: prazo no formato "AAAA-MM-DD", opcional.
    """
    db = SessionLocal()

    try:
        parsed_deadline = _parse_iso_date(deadline, "deadline")
        if isinstance(parsed_deadline, dict):
            return parsed_deadline

        goal_data = GoalCreate(
            name=name,
            description=description,
            target_amount=target_amount,
            current_amount=current_amount,
            deadline=parsed_deadline,
        )

        goal = goal_service.create_goal(
            db,
            goal_data,
        )

        return {
            "id": goal.id,
            "name": goal.name,
            "target_amount": goal.target_amount,
            "current_amount": goal.current_amount,
            "progress_percentage": goal.progress_percentage,
            "deadline": str(goal.deadline) if goal.deadline else None,
            "status": goal.status,
        }

    finally:
        db.close()


@tool
def list_goals() -> list:
    """
    Lista todas as metas financeiras cadastradas, com o progresso e o
    status (active, completed ou overdue) de cada uma.
    """
    db = SessionLocal()

    try:
        goals = goal_service.get_all_goals(db)

        return [
            {
                "id": goal.id,
                "name": goal.name,
                "target_amount": goal.target_amount,
                "current_amount": goal.current_amount,
                "progress_percentage": goal.progress_percentage,
                "remaining_amount": goal.remaining_amount,
                "deadline": str(goal.deadline) if goal.deadline else None,
                "status": goal.status,
            }
            for goal in goals
        ]

    finally:
        db.close()


@tool
def add_goal_progress(
    goal_id: Annotated[int, Field(ge=1)],
    amount: Annotated[float, Field(gt=0)],
) -> dict:
    """
    Adiciona um valor ao progresso de uma meta já existente.

    Args:
        goal_id: id da meta (obtido via list_goals).
        amount: valor a ser somado ao progresso atual da meta.
    """
    db = SessionLocal()

    try:
        goal = goal_service.add_progress(
            db,
            goal_id,
            amount,
        )

        if not goal:
            return {"error": "Meta não encontrada."}

        return {
            "id": goal.id,
            "name": goal.name,
            "current_amount": goal.current_amount,
            "progress_percentage": goal.progress_percentage,
            "status": goal.status,
        }

    finally:
        db.close()


@tool
def create_fixed_expense(
    name: Annotated[str, Field(min_length=1, max_length=150)],
    category: Annotated[str, Field(min_length=1, max_length=100)],
    amount: Annotated[float, Field(gt=0)],
    billing_day: Annotated[int, Field(ge=1, le=31)],
) -> dict:
    """
    Cadastra uma despesa fixa recorrente (ex: aluguel, internet, Netflix,
    Spotify, faculdade).

    Args:
        name: nome da despesa fixa.
        category: categoria da despesa.
        amount: valor da cobrança mensal.
        billing_day: dia do mês em que a cobrança ocorre (1 a 31).
    """
    db = SessionLocal()

    try:
        expense_data = FixedExpenseCreate(
            name=name,
            category=category,
            amount=amount,
            billing_day=billing_day,
        )

        expense = fixed_expense_service.create_fixed_expense(
            db,
            expense_data,
        )

        return {
            "id": expense.id,
            "name": expense.name,
            "category": expense.category,
            "amount": expense.amount,
            "billing_day": expense.billing_day,
        }

    finally:
        db.close()


@tool
def list_fixed_expenses(only_active: bool = True) -> list:
    """
    Lista as despesas fixas cadastradas.

    Args:
        only_active: se True (padrão), retorna apenas despesas fixas ativas.
            Se False, retorna todas, incluindo as desativadas.
    """
    db = SessionLocal()

    try:
        if only_active:
            expenses = fixed_expense_service.get_active_fixed_expenses(db)
        else:
            expenses = fixed_expense_service.get_all_fixed_expenses(db)

        return [
            {
                "id": expense.id,
                "name": expense.name,
                "category": expense.category,
                "amount": expense.amount,
                "billing_day": expense.billing_day,
                "active": expense.active,
            }
            for expense in expenses
        ]

    finally:
        db.close()


@tool
def get_dashboard_summary() -> dict:
    """
    Retorna um resumo financeiro completo: saldo, total de despesas fixas,
    quantidade de metas, despesas por categoria e transações recentes.
    Use quando o usuário pedir um panorama geral das finanças.
    """
    db = SessionLocal()

    try:
        return dashboard_service.get_dashboard_summary(db)

    finally:
        db.close()


# Lista de tools exposta para o agente LangChain.
FINANCE_TOOLS = [
    create_transaction,
    mark_transaction_status,
    search_transactions,
    generate_recurring_occurrences,
    get_balance,
    list_recent_transactions,
    get_expenses_by_category,
    get_monthly_report,
    get_category_breakdown,
    create_goal,
    list_goals,
    add_goal_progress,
    create_fixed_expense,
    list_fixed_expenses,
    get_dashboard_summary,
]
