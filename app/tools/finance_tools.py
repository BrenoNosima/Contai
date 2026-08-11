from typing import Optional

from langchain_core.tools import tool

from app.core.database import SessionLocal

from app.schemas.transaction import TransactionCreate
from app.schemas.goal import GoalCreate
from app.schemas.fixed_expense import FixedExpenseCreate

from app.services.transaction_service import TransactionService
from app.services.goal_service import GoalService
from app.services.fixed_expense_service import FixedExpenseService
from app.services.dashboard_service import DashboardService

# Instâncias únicas dos services. Cada tool abre e fecha sua própria
# sessão de banco (SessionLocal), então isso é seguro de compartilhar.
transaction_service = TransactionService()
goal_service = GoalService()
fixed_expense_service = FixedExpenseService()
dashboard_service = DashboardService()


@tool
def create_transaction(
    type: str,
    description: str,
    category: str,
    amount: float,
    priority: Optional[str] = None,
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
    """
    db = SessionLocal()

    try:
        transaction_data = TransactionCreate(
            type=type,
            description=description,
            category=category,
            amount=amount,
            priority=priority,
            source="ai",
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
        }

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
def list_recent_transactions(limit: int = 5) -> list:
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
            }
            for transaction in transactions
        ]

    finally:
        db.close()


@tool
def get_expenses_by_category() -> list:
    """
    Retorna o total de despesas agrupado por categoria. Use quando o
    usuário quiser saber onde está gastando mais.
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
def create_goal(
    name: str,
    target_amount: float,
    current_amount: float = 0.0,
    description: Optional[str] = None,
) -> dict:
    """
    Cria uma nova meta financeira e salva no banco de dados.

    Args:
        name: nome da meta (ex: "Viagem para a praia", "Reserva de emergência").
        target_amount: valor total que se deseja alcançar.
        current_amount: valor já guardado até o momento (padrão 0).
        description: descrição opcional da meta.
    """
    db = SessionLocal()

    try:
        goal_data = GoalCreate(
            name=name,
            description=description,
            target_amount=target_amount,
            current_amount=current_amount,
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
        }

    finally:
        db.close()


@tool
def list_goals() -> list:
    """
    Lista todas as metas financeiras cadastradas, com o progresso de cada uma.
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
            }
            for goal in goals
        ]

    finally:
        db.close()


@tool
def add_goal_progress(
    goal_id: int,
    amount: float,
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
        }

    finally:
        db.close()


@tool
def create_fixed_expense(
    name: str,
    category: str,
    amount: float,
    billing_day: int,
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
    get_balance,
    list_recent_transactions,
    get_expenses_by_category,
    create_goal,
    list_goals,
    add_goal_progress,
    create_fixed_expense,
    list_fixed_expenses,
    get_dashboard_summary,
]