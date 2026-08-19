from datetime import date

from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from app.models.transaction import Transaction


class TransactionRepository:

    def create(
        self,
        db: Session,
        transaction: Transaction,
    ) -> Transaction:

        db.add(transaction)
        db.commit()
        db.refresh(transaction)

        return transaction

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

        db.commit()
        db.refresh(transaction)

        return transaction

    def update_status(
        self,
        db: Session,
        transaction: Transaction,
        status: str,
    ) -> Transaction:

        transaction.status = status

        db.commit()
        db.refresh(transaction)

        return transaction

    def delete(
        self,
        db: Session,
        transaction: Transaction,
    ) -> None:

        db.delete(transaction)
        db.commit()

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
            .filter(Transaction.status == "paid")
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
