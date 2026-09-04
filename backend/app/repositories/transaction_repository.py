from calendar import monthrange
from datetime import date
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import case, extract, func, or_
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

    def get_pending_period_totals(
        self,
        db: Session,
        start_date: date,
        end_date: date,
    ):
        return (
            db.query(
                func.coalesce(
                    func.sum(case(
                        (Transaction.type == "income", Transaction.amount),
                        else_=0,
                    )),
                    0,
                ).label("pending_income"),
                func.coalesce(
                    func.sum(case(
                        (Transaction.type == "expense", Transaction.amount),
                        else_=0,
                    )),
                    0,
                ).label("pending_expenses"),
            )
            .filter(
                Transaction.status == "pending",
                Transaction.due_date >= start_date,
                Transaction.due_date <= end_date,
            )
            .one()
        )

    def get_materialized_commitment_keys(
        self,
        db: Session,
        start_date: date,
        end_date: date,
    ) -> list[tuple[int | None, int | None, date]]:
        return (
            db.query(
                Transaction.parent_id,
                Transaction.fixed_expense_id,
                Transaction.due_date,
            )
            .filter(
                Transaction.due_date >= start_date,
                Transaction.due_date <= end_date,
                or_(
                    Transaction.parent_id.isnot(None),
                    Transaction.fixed_expense_id.isnot(None),
                ),
            )
            .all()
        )

    def get_pending_monthly_totals(
        self,
        db: Session,
        start_date: date,
        end_date: date,
    ):
        return (
            db.query(
                extract("year", Transaction.due_date).label("year"),
                extract("month", Transaction.due_date).label("month"),
                Transaction.type,
                func.sum(Transaction.amount).label("total"),
            )
            .filter(
                Transaction.status == "pending",
                Transaction.due_date >= start_date,
                Transaction.due_date <= end_date,
            )
            .group_by(
                extract("year", Transaction.due_date),
                extract("month", Transaction.due_date),
                Transaction.type,
            )
            .all()
        )

    def get_period_aggregate(
        self,
        db: Session,
        start_date: date,
        end_date: date,
    ):
        """Aggregate paid transactions by financial competence (due_date)."""

        return (
            db.query(
                func.coalesce(
                    func.sum(
                        case(
                            (Transaction.type == "income", Transaction.amount),
                            else_=0,
                        )
                    ),
                    0,
                ).label("total_income"),
                func.coalesce(
                    func.sum(
                        case(
                            (Transaction.type == "expense", Transaction.amount),
                            else_=0,
                        )
                    ),
                    0,
                ).label("total_expenses"),
                func.count(Transaction.id).label("transaction_count"),
            )
            .filter(
                Transaction.status == "paid",
                Transaction.due_date >= start_date,
                Transaction.due_date <= end_date,
            )
            .one()
        )

    def get_category_expense_total(
        self,
        db: Session,
        category: str,
        start_date: date,
        end_date: date,
    ):
        """Sum paid expenses for one exact category and due-date period."""

        return (
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.type == "expense",
                Transaction.status == "paid",
                Transaction.category == category,
                Transaction.due_date >= start_date,
                Transaction.due_date <= end_date,
            )
            .scalar()
        )

    def get_top_expenses(
        self,
        db: Session,
        start_date: date,
        end_date: date,
        limit: int,
    ) -> list[Transaction]:
        """Return the largest paid expenses for a due-date period."""

        return (
            db.query(Transaction)
            .filter(
                Transaction.type == "expense",
                Transaction.status == "paid",
                Transaction.due_date >= start_date,
                Transaction.due_date <= end_date,
            )
            .order_by(
                Transaction.amount.desc(),
                Transaction.due_date.desc(),
                Transaction.id.desc(),
            )
            .limit(limit)
            .all()
        )

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
        installment: bool | None = None,
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

        if installment is True:
            query = query.filter(Transaction.installment_group_id.isnot(None))
        elif installment is False:
            query = query.filter(Transaction.installment_group_id.is_(None))

        return query.order_by(Transaction.due_date.desc()).all()

    def get_installments(self, db: Session, group_id: str):
        return (
            db.query(Transaction)
            .filter(Transaction.installment_group_id == group_id)
            .order_by(Transaction.installment_number.asc())
            .all()
        )

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
        transaction.settled_at = (
            datetime.now(UTC).replace(tzinfo=None) if status == "paid" else None
        )

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
    ) -> Decimal:
        return (
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.type == "income",
                Transaction.status == "paid",
            )
            .scalar()
        )

    def get_total_expense(
        self,
        db: Session,
    ) -> Decimal:
        return (
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.type == "expense",
                Transaction.status == "paid",
            )
            .scalar()
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
            .filter(
                Transaction.status == "paid",
                Transaction.settled_at.isnot(None),
            )
            .order_by(
                Transaction.settled_at.desc()
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
