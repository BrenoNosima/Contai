from calendar import monthrange
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal, ROUND_DOWN
from uuid import uuid4

from sqlalchemy.orm import Session

from app.core.exceptions import DomainValidationError
from app.models.transaction import Transaction

from app.repositories.transaction_repository import (
    TransactionRepository,
)
from app.repositories.fixed_expense_repository import FixedExpenseRepository

from app.schemas.transaction import (
    TransactionCreate,
    InstallmentCreate,
    TransactionUpdate,
)


class TransactionService:

    def __init__(self):
        self.repository = TransactionRepository()
        self.fixed_expense_repository = FixedExpenseRepository()

    def create_transaction(
        self,
        db: Session,
        transaction_data: TransactionCreate,
    ) -> Transaction:

        due_date = transaction_data.due_date or date.today()

        status = transaction_data.status
        if status is None:
            # Lançamentos futuros começam pendentes; os demais entram
            # como pagos quando nenhum status é informado.
            status = "pending" if due_date > date.today() else "paid"

        transaction = Transaction(
            type=transaction_data.type,
            description=transaction_data.description,
            category=transaction_data.category,
            amount=transaction_data.amount,
            priority=transaction_data.priority,
            source=transaction_data.source,
            due_date=due_date,
            status=status,
            settled_at=(datetime.now(UTC).replace(tzinfo=None) if status == "paid" else None),
            is_recurring=transaction_data.is_recurring,
            recurrence=transaction_data.recurrence,
        )

        return self.repository.create(
            db,
            transaction,
        )

    def create_ai_transaction(
        self,
        db: Session,
        transaction_data: TransactionCreate,
    ) -> Transaction:
        """Cria uma transação garantindo a origem dos fluxos de IA."""

        return self.create_transaction(
            db,
            transaction_data.model_copy(update={"source": "ai"}),
        )

    def get_transaction(
        self,
        db: Session,
        transaction_id: int,
    ) -> Transaction | None:

        return self.repository.get_by_id(
            db,
            transaction_id,
        )

    def list_transactions(
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
        """Lista com filtros — usada pela tela de Lançamentos e pelo agente."""

        if not any(
            [type, category, status, start_date, end_date, is_recurring is not None, installment is not None]
        ):
            return self.repository.get_all(db)

        return self.repository.filter(
            db,
            type=type,
            category=category,
            status=status,
            start_date=start_date,
            end_date=end_date,
            is_recurring=is_recurring,
            installment=installment,
        )

    def create_installments(self, db: Session, data: InstallmentCreate) -> list[Transaction]:
        group_id = str(uuid4())
        amounts = self.split_installment_amounts(
            data.total_amount,
            data.installment_count,
        )
        items: list[Transaction] = []
        for index, amount in enumerate(amounts):
            due_date = _add_months(data.first_due_date, index)
            items.append(Transaction(
                type="expense",
                description=data.description,
                category=data.category,
                amount=amount,
                priority=data.priority,
                source="manual",
                due_date=due_date,
                status="pending" if due_date > date.today() else "paid",
                settled_at=(
                    None
                    if due_date > date.today()
                    else datetime.combine(due_date, time.min)
                ),
                is_recurring=False,
                recurrence=None,
                installment_group_id=group_id,
                installment_number=index + 1,
                installment_count=data.installment_count,
            ))
        return self.repository.create_many(db, items)

    @staticmethod
    def split_installment_amounts(
        total_amount,
        installment_count: int,
    ) -> list[Decimal]:
        """Split an amount in cents while preserving the exact total."""

        total = Decimal(str(total_amount)).quantize(Decimal("0.01"))
        if total <= 0:
            raise DomainValidationError("O valor deve ser maior que zero.")
        if not 1 <= installment_count <= 120:
            raise DomainValidationError("A quantidade de parcelas deve estar entre 1 e 120.")
        base = (total / installment_count).quantize(
            Decimal("0.01"),
            rounding=ROUND_DOWN,
        )
        remainder = total - (base * installment_count)
        return [
            base + (remainder if index == installment_count - 1 else Decimal("0"))
            for index in range(installment_count)
        ]

    def get_installments(self, db: Session, group_id: str) -> list[Transaction]:
        return self.repository.get_installments(db, group_id)

    def get_period_summary(self, db: Session, start_date: date, end_date: date):
        items = self.repository.filter(db, start_date=start_date, end_date=end_date)
        income = sum((item.amount for item in items if item.type == "income" and item.status == "paid"), Decimal("0"))
        expense = sum((item.amount for item in items if item.type == "expense" and item.status == "paid"), Decimal("0"))
        pending_income = sum((item.amount for item in items if item.type == "income" and item.status == "pending"), Decimal("0"))
        pending_expense = sum((item.amount for item in items if item.type == "expense" and item.status == "pending"), Decimal("0"))
        return {"income": float(income), "expense": float(expense), "balance": float(income - expense), "pending_income": float(pending_income), "pending_expense": float(pending_expense)}

    def update_transaction(
        self,
        db: Session,
        transaction_id: int,
        update_data: TransactionUpdate,
    ) -> Transaction | None:

        transaction = self.repository.get_by_id(
            db,
            transaction_id,
        )

        if not transaction:
            return None

        changes = update_data.model_dump(exclude_unset=True)
        resulting_type = changes.get("type", transaction.type)
        resulting_priority = changes.get("priority", transaction.priority)
        resulting_recurring = changes.get("is_recurring", transaction.is_recurring)
        resulting_recurrence = changes.get("recurrence", transaction.recurrence)

        if resulting_type == "income" and resulting_priority is not None:
            raise DomainValidationError("Receitas não podem ter prioridade.")
        if resulting_recurring != (resulting_recurrence is not None):
            raise DomainValidationError(
                "is_recurring e recurrence devem ser informados juntos."
            )

        if "status" in changes and changes["status"] != transaction.status:
            transaction.settled_at = (
                datetime.now(UTC).replace(tzinfo=None)
                if changes["status"] == "paid"
                else None
            )

        for field, value in changes.items():
            setattr(
                transaction,
                field,
                value,
            )

        return self.repository.update(
            db,
            transaction,
        )

    def update_status(
        self,
        db: Session,
        transaction_id: int,
        status: str,
    ) -> Transaction | None:
        """Marca uma transação como paga ou pendente."""

        if status not in {"paid", "pending"}:
            raise DomainValidationError("Status inválido.")

        transaction = self.repository.get_by_id(
            db,
            transaction_id,
        )

        if not transaction:
            return None

        return self.repository.update_status(
            db,
            transaction,
            status,
        )

    def delete_transaction(
        self,
        db: Session,
        transaction_id: int,
    ) -> bool:

        transaction = self.repository.get_by_id(
            db,
            transaction_id,
        )

        if not transaction:
            return False

        self.repository.delete(
            db,
            transaction,
        )

        return True

    def get_balance(
        self,
        db: Session,
    ) -> float:

        total_income, total_expense = self.get_totals(db)

        return float(
            total_income - total_expense
        )

    def get_totals(self, db: Session) -> tuple[float, float]:
        """Retorna os totais pagos de receitas e despesas."""

        return (
            self.repository.get_total_income(db),
            self.repository.get_total_expense(db),
        )

    def get_recent_transactions(
        self,
        db: Session,
        limit: int = 5,
    ) -> list[Transaction]:
        return self.repository.get_recent_transactions(db, limit)

    def get_expenses_by_category(self, db: Session):
        return self.repository.get_expenses_by_category(db)

    def generate_recurring_occurrences(
        self,
        db: Session,
        months_ahead: int = 3,
    ) -> list[Transaction]:
        """
        Para cada transação marcada como recorrente (is_recurring=True),
        garante que existam ocorrências futuras já lançadas como
        "pendente" — sem duplicar quem já foi gerado. Retorna só as
        ocorrências novas criadas nesta chamada (idempotente).
        """

        templates = self.repository.get_recurring_templates(db)
        created: list[Transaction] = []

        for template in templates:
            for occurrence_date in self._project_dates(
                template.due_date,
                template.recurrence,
                months_ahead,
            ):
                if self.repository.occurrence_exists(
                    db,
                    template.id,
                    occurrence_date,
                ):
                    continue

                occurrence = Transaction(
                    type=template.type,
                    description=template.description,
                    category=template.category,
                    amount=template.amount,
                    priority=template.priority,
                    source="recurring",
                    due_date=occurrence_date,
                    status="pending",
                    is_recurring=False,
                    recurrence=None,
                    parent_id=template.id,
                )

                created.append(occurrence)

        for expense in self.fixed_expense_repository.get_active(db):
            for occurrence_date in self._project_fixed_expense_dates(
                expense.billing_day,
                months_ahead,
            ):
                if self.repository.fixed_expense_occurrence_exists(
                    db,
                    expense.id,
                    occurrence_date,
                ):
                    continue

                created.append(
                    Transaction(
                        type="expense",
                        description=expense.name,
                        category=expense.category,
                        amount=expense.amount,
                        priority=None,
                        source="recurring",
                        due_date=occurrence_date,
                        status="pending",
                        is_recurring=False,
                        recurrence=None,
                        fixed_expense_id=expense.id,
                    )
                )

        return self.repository.create_many(db, created)

    @staticmethod
    def _project_fixed_expense_dates(
        billing_day: int,
        months_ahead: int,
    ) -> list[date]:
        today = date.today()
        dates = []

        for offset in range(months_ahead + 1):
            month = _add_months(today.replace(day=1), offset)
            day = min(billing_day, monthrange(month.year, month.month)[1])
            dates.append(month.replace(day=day))

        return dates

    @staticmethod
    def _project_dates(
        start: date,
        recurrence: str | None,
        months_ahead: int,
    ) -> list[date]:

        if recurrence == "weekly":
            horizon = _add_months(date.today(), months_ahead)
            step = timedelta(weeks=1)
        else:
            # monthly (padrão)
            horizon = _add_months(date.today(), months_ahead)
            step = None

        dates: list[date] = []
        month_offset = 1
        current = start + step if step else _add_months(start, month_offset)

        while current <= horizon:
            if current > date.today():
                dates.append(current)

            if step:
                current += step
            else:
                month_offset += 1
                current = _add_months(start, month_offset)

        return dates


def _add_months(source: date, months: int) -> date:
    month_index = source.month - 1 + months
    year = source.year + month_index // 12
    month = month_index % 12 + 1
    day = min(source.day, monthrange(year, month)[1])
    return date(year, month, day)
