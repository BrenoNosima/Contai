from calendar import monthrange
from datetime import date

from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from app.core.exceptions import PersistenceConflictError
from app.core.persistence import commit
from app.models.transaction import Transaction


def _period_start(months: int) -> date:
    today = date.today()
    month_index = today.year * 12 + today.month - months
    year, zero_month = divmod(month_index, 12)
    return date(year, zero_month + 1, 1)


class TransactionRepository:

    def create(
        self,
        db: Session,
        transaction: Transaction,
    ) -> Transaction:

        db.add(transaction)
        return commit(db, transaction)

    def create_many(
        self,
        db: Session,
        transactions: list[Transaction],
    ) -> list[Transaction]:
        """Persiste um lote inteiro ou não persiste nenhuma ocorrência."""

        if not transactions:
            return []

        db.add_all(transactions)
        try:
            commit(db)
        except PersistenceConflictError:
            # Outra geração concorrente pode ter criado a mesma ocorrência
            # entre a consulta de existência e o commit do lote.
            return []

        for transaction in transactions:
            db.refresh(transaction)

        return transactions

    def get_by_id(
        self,
        db: Session,
        transaction_id: int,
    ) -> Transaction | None:

        return (
            db.query(Transaction)
            .filter(Transaction.id == transaction_id)
            .first()
        )

    def get_all(
        self,
        db: Session,
    ):

        return (
            db.query(Transaction)
            .order_by(Transaction.created_at.desc())
            .all()
        )

    def filter(
        self,
        db: Session,
        type: str | None = None,
        category: str | None = None,
        status: str | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        is_recurring: bool | None = None,
    ):
        """
        Lista transações com filtros opcionais — usada pela tela de
        Lançamentos (lista filtrável) e pelas tools do agente.
        """

        query = db.query(Transaction)

        if type:
            query = query.filter(Transaction.type == type)

        if category:
            query = query.filter(Transaction.category == category)

        if status:
            query = query.filter(Transaction.status == status)

        if start_date:
            query = query.filter(Transaction.due_date >= start_date)

        if end_date:
            query = query.filter(Transaction.due_date <= end_date)

        if is_recurring is not None:
            query = query.filter(Transaction.is_recurring == is_recurring)

        return query.order_by(Transaction.due_date.desc()).all()

    def update(
        self,
        db: Session,
        transaction: Transaction,
    ) -> Transaction:

        return commit(db, transaction)

    def update_status(
        self,
        db: Session,
        transaction: Transaction,
        status: str,
    ) -> Transaction:

        transaction.status = status

        return commit(db, transaction)

    def delete(
        self,
        db: Session,
        transaction: Transaction,
    ) -> None:

        db.delete(transaction)
        commit(db)

    def get_total_income(
        self,
        db: Session,
    ) -> float:

        transactions = (
            db.query(Transaction)
            .filter(Transaction.type == "income", Transaction.status == "paid")
            .all()
        )

        return sum(
            transaction.amount
            for transaction in transactions
        )

    def get_total_expense(
        self,
        db: Session,
    ) -> float:

        transactions = (
            db.query(Transaction)
            .filter(Transaction.type == "expense", Transaction.status == "paid")
            .all()
        )

        return sum(
            transaction.amount
            for transaction in transactions
        )

    def get_expenses_by_category(
        self,
        db: Session,
    ):

        return (
            db.query(
                Transaction.category,
                func.sum(
                    Transaction.amount
                ).label("total")
            )
            .filter(
                Transaction.type == "expense",
                Transaction.status == "paid",
            )
            .group_by(
                Transaction.category
            )
            .all()
        )

    def get_recent_transactions(
        self,
        db: Session,
        limit: int = 5,
    ):

        return (
            db.query(Transaction)
            .order_by(
                Transaction.created_at.desc()
            )
            .limit(limit)
            .all()
        )

    def get_recurring_templates(
        self,
        db: Session,
    ):
        """
        Transações marcadas como recorrentes que ainda não são, elas
        mesmas, uma ocorrência gerada de outra (parent_id is None) —
        usadas para projetar as próximas cobranças.
        """

        return (
            db.query(Transaction)
            .filter(
                Transaction.is_recurring == True,  # noqa: E712
                Transaction.parent_id.is_(None),
            )
            .all()
        )

    def occurrence_exists(
        self,
        db: Session,
        parent_id: int,
        due_date: date,
    ) -> bool:

        return (
            db.query(Transaction)
            .filter(
                Transaction.parent_id == parent_id,
                Transaction.due_date == due_date,
            )
            .first()
            is not None
        )

    def fixed_expense_occurrence_exists(
        self,
        db: Session,
        fixed_expense_id: int,
        due_date: date,
    ) -> bool:
        return (
            db.query(Transaction)
            .filter(
                Transaction.fixed_expense_id == fixed_expense_id,
                Transaction.due_date == due_date,
            )
            .first()
            is not None
        )

    def sync_pending_fixed_expense_occurrences(
        self,
        db: Session,
        fixed_expense,
        *,
        commit_changes: bool = True,
    ) -> None:
        occurrences = (
            db.query(Transaction)
            .filter(
                Transaction.fixed_expense_id == fixed_expense.id,
                Transaction.status == "pending",
            )
            .all()
        )

        for occurrence in occurrences:
            occurrence.description = fixed_expense.name
            occurrence.category = fixed_expense.category
            occurrence.amount = fixed_expense.amount
            day = min(
                fixed_expense.billing_day,
                monthrange(occurrence.due_date.year, occurrence.due_date.month)[1],
            )
            occurrence.due_date = occurrence.due_date.replace(day=day)

        if commit_changes:
            commit(db)

    def remove_pending_fixed_expense_occurrences(
        self,
        db: Session,
        fixed_expense_id: int,
        *,
        commit_changes: bool = True,
    ) -> None:
        (
            db.query(Transaction)
            .filter(
                Transaction.fixed_expense_id == fixed_expense_id,
                Transaction.status == "pending",
            )
            .delete(synchronize_session=False)
        )
        if commit_changes:
            commit(db)

    def detach_fixed_expense_history(
        self,
        db: Session,
        fixed_expense_id: int,
        *,
        commit_changes: bool = True,
    ) -> None:
        (
            db.query(Transaction)
            .filter(Transaction.fixed_expense_id == fixed_expense_id)
            .update({Transaction.fixed_expense_id: None}, synchronize_session=False)
        )
        if commit_changes:
            commit(db)

    def get_monthly_totals(
        self,
        db: Session,
        months: int = 6,
    ):
        """
        Agrupa receitas/despesas por mês de competência (due_date) —
        usado no relatório de tendência de 6 meses. Escrito para
        PostgreSQL (date_trunc).
        """

        rows = (
            db.query(
                extract("year", Transaction.due_date).label("year"),
                extract("month", Transaction.due_date).label("month"),
                Transaction.type,
                func.sum(Transaction.amount).label("total"),
            )
            .filter(
                Transaction.status == "paid",
                Transaction.due_date >= _period_start(months),
            )
            .group_by(
                extract("year", Transaction.due_date),
                extract("month", Transaction.due_date),
                Transaction.type,
            )
            .order_by(
                extract("year", Transaction.due_date).desc(),
                extract("month", Transaction.due_date).desc(),
            )
            .all()
        )

        return rows

    def get_expense_totals_since(
        self,
        db: Session,
        months: int,
    ):
        """Agrupa despesas pagas por categoria dentro dos últimos N meses."""

        return (
            db.query(
                Transaction.category,
                func.sum(Transaction.amount).label("total"),
            )
            .filter(
                Transaction.type == "expense",
                Transaction.status == "paid",
                Transaction.due_date >= _period_start(months),
            )
            .group_by(Transaction.category)
            .order_by(func.sum(Transaction.amount).desc())
            .all()
        )

    def get_category_breakdown(
        self,
        db: Session,
        month: int,
        year: int,
        type: str | None = None,
    ):
        """Total por categoria dentro de um mês/ano específico."""

        query = db.query(
            Transaction.category,
            Transaction.type,
            func.sum(Transaction.amount).label("total"),
        ).filter(
            extract("month", Transaction.due_date) == month,
            extract("year", Transaction.due_date) == year,
            Transaction.status == "paid",
        )

        if type:
            query = query.filter(Transaction.type == type)

        return (
            query.group_by(Transaction.category, Transaction.type)
            .order_by(func.sum(Transaction.amount).desc())
            .all()
        )
