from calendar import monthrange
from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP, ROUND_UP

from app.core.exceptions import DomainValidationError
from app.repositories.fixed_expense_repository import FixedExpenseRepository
from app.repositories.transaction_repository import TransactionRepository
from app.services.goal_service import GoalService
from app.services.transaction_service import TransactionService


CENT = Decimal("0.01")


class PlanningService:
    def __init__(self):
        self.transaction_repository = TransactionRepository()
        self.fixed_expense_repository = FixedExpenseRepository()
        self.transaction_service = TransactionService()
        self.goal_service = GoalService()

    def get_committed_amount(self, db, start_date: date, end_date: date) -> dict:
        forecast = self._forecast(db, start_date, end_date)
        recurring_expenses = self._money(forecast["projected_expenses"])
        pending_expenses = self._money(forecast["pending_expenses"])
        return {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "committed_amount": self._money(
                pending_expenses + recurring_expenses
            ),
            "pending_transactions": pending_expenses,
            "fixed_or_recurring_commitments": recurring_expenses,
        }

    def project_cash_flow(self, db, start_date: date, end_date: date) -> dict:
        forecast = self._forecast(db, start_date, end_date)
        total_income, total_expenses = self.transaction_service.get_totals(db)
        current_balance = self._money(total_income - total_expenses)
        expected_income = self._money(
            forecast["pending_income"] + forecast["projected_income"]
        )
        committed_expenses = self._money(
            forecast["pending_expenses"] + forecast["projected_expenses"]
        )
        return {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "current_balance": current_balance,
            "expected_income": expected_income,
            "committed_expenses": committed_expenses,
            "projected_balance": self._money(
                current_balance + expected_income - committed_expenses
            ),
        }

    def simulate_installment_purchase(
        self,
        db,
        amount,
        installments: int,
        start_date: date | None = None,
    ) -> dict:
        first_due_date = start_date or date.today()
        amounts = self.transaction_service.split_installment_amounts(
            amount,
            installments,
        )
        due_dates = [
            self._add_months(first_due_date, index)
            for index in range(installments)
        ]
        horizon_start = due_dates[0].replace(day=1)
        last_due_date = due_dates[-1]
        horizon_end = last_due_date.replace(
            day=monthrange(last_due_date.year, last_due_date.month)[1]
        )
        monthly_forecast = self._monthly_forecast(
            db,
            horizon_start,
            horizon_end,
        )
        total_income, total_expenses = self.transaction_service.get_totals(db)
        current_balance = self._money(total_income - total_expenses)
        schedule = []
        for index, (due_date, installment_amount) in enumerate(
            zip(due_dates, amounts, strict=True)
        ):
            forecast = monthly_forecast.get(
                (due_date.year, due_date.month),
                {"income": Decimal("0"), "expenses": Decimal("0")},
            )
            available_before = self._money(
                forecast["income"] - forecast["expenses"]
            )
            projected_before = self._money(current_balance + available_before)
            schedule.append({
                "installment_number": index + 1,
                "due_date": due_date.isoformat(),
                "amount": self._money(installment_amount),
                "monthly_available_before": available_before,
                "monthly_available_after": self._money(
                    available_before - installment_amount
                ),
                "projected_balance_before": projected_before,
                "projected_balance_after": self._money(
                    projected_before - installment_amount
                ),
            })
        return {
            "purchase_amount": self._money(amount),
            "installments": installments,
            "first_due_date": first_due_date.isoformat(),
            "installment_amounts": [self._money(item) for item in amounts],
            "schedule": schedule,
        }

    def calculate_goal_contribution(
        self,
        db,
        goal_id: int,
        target_date: date | None = None,
        *,
        as_of: date | None = None,
    ) -> dict:
        goal = self.goal_service.get_goal(db, goal_id)
        if not goal:
            raise DomainValidationError("Meta não encontrada.")
        today = as_of or date.today()
        deadline = target_date or self._as_date(goal.deadline)
        remaining = self._money(max(
            Decimal(str(goal.target_amount)) - Decimal(str(goal.current_amount)),
            Decimal("0"),
        ))
        if remaining == 0:
            return self._goal_result(goal, deadline, remaining, 0, Decimal("0"))
        if deadline is None:
            raise DomainValidationError("A meta não possui prazo definido.")
        if deadline < today:
            raise DomainValidationError("O prazo da meta já passou.")
        months = (
            (deadline.year - today.year) * 12
            + deadline.month
            - today.month
            + 1
        )
        contribution = (remaining / months).quantize(CENT, rounding=ROUND_UP)
        return self._goal_result(goal, deadline, remaining, months, contribution)

    def simulate_goal_impact(
        self,
        db,
        goal_id: int,
        purchase_amount,
        installments: int,
        start_date: date | None = None,
        *,
        as_of: date | None = None,
    ) -> dict:
        contribution = self.calculate_goal_contribution(
            db,
            goal_id,
            as_of=as_of,
        )
        purchase = self.simulate_installment_purchase(
            db,
            purchase_amount,
            installments,
            start_date,
        )
        required = contribution["required_monthly_contribution"]
        deadline = contribution["target_date"]
        impacts = []
        for item in purchase["schedule"]:
            due_date = date.fromisoformat(item["due_date"])
            if deadline and due_date > date.fromisoformat(deadline):
                continue
            impacts.append({
                **item,
                "required_monthly_contribution": required,
                "goal_surplus_before": self._money(
                    item["monthly_available_before"] - required
                ),
                "goal_surplus_after": self._money(
                    item["monthly_available_after"] - required
                ),
            })
        return {
            "goal": contribution,
            "purchase_amount": purchase["purchase_amount"],
            "installments": installments,
            "goal_period_impacts": impacts,
        }

    def _forecast(self, db, start_date: date, end_date: date) -> dict:
        self._validate_period(start_date, end_date)
        monthly = self._monthly_forecast(db, start_date, end_date)
        pending = self.transaction_repository.get_pending_period_totals(
            db,
            start_date,
            end_date,
        )
        total_income = sum(
            (item["income"] for item in monthly.values()),
            Decimal("0"),
        )
        total_expenses = sum(
            (item["expenses"] for item in monthly.values()),
            Decimal("0"),
        )
        pending_income = self._money(pending.pending_income)
        pending_expenses = self._money(pending.pending_expenses)
        return {
            "pending_income": pending_income,
            "pending_expenses": pending_expenses,
            "projected_income": self._money(total_income - pending_income),
            "projected_expenses": self._money(total_expenses - pending_expenses),
        }

    def _monthly_forecast(
        self,
        db,
        start_date: date,
        end_date: date,
    ) -> dict[tuple[int, int], dict[str, Decimal]]:
        self._validate_period(start_date, end_date)
        monthly: dict[tuple[int, int], dict[str, Decimal]] = {}
        for year, month, transaction_type, total in (
            self.transaction_repository.get_pending_monthly_totals(
                db,
                start_date,
                end_date,
            )
        ):
            bucket = monthly.setdefault(
                (int(year), int(month)),
                {"income": Decimal("0"), "expenses": Decimal("0")},
            )
            key = "income" if transaction_type == "income" else "expenses"
            bucket[key] += Decimal(str(total))

        projection_start = max(start_date, date.today())
        if projection_start <= end_date:
            materialized = self.transaction_repository.get_materialized_commitment_keys(
                db,
                projection_start,
                end_date,
            )
            recurring_keys = {
                (parent_id, due_date)
                for parent_id, _fixed_id, due_date in materialized
                if parent_id is not None
            }
            fixed_keys = {
                (fixed_id, due_date)
                for _parent_id, fixed_id, due_date in materialized
                if fixed_id is not None
            }
            for template in self.transaction_repository.get_recurring_templates(db):
                for occurrence_date in self._recurring_dates(
                    template.due_date,
                    template.recurrence,
                    projection_start,
                    end_date,
                ):
                    if (template.id, occurrence_date) in recurring_keys:
                        continue
                    bucket = monthly.setdefault(
                        (occurrence_date.year, occurrence_date.month),
                        {"income": Decimal("0"), "expenses": Decimal("0")},
                    )
                    if template.type == "income":
                        bucket["income"] += template.amount
                    else:
                        bucket["expenses"] += template.amount
            for expense in self.fixed_expense_repository.get_active(db):
                for occurrence_date in self._fixed_dates(
                    expense.billing_day,
                    projection_start,
                    end_date,
                ):
                    if (expense.id, occurrence_date) not in fixed_keys:
                        bucket = monthly.setdefault(
                            (occurrence_date.year, occurrence_date.month),
                            {"income": Decimal("0"), "expenses": Decimal("0")},
                        )
                        bucket["expenses"] += expense.amount
        return monthly

    @classmethod
    def _recurring_dates(
        cls,
        template_date: date,
        recurrence: str | None,
        start_date: date,
        end_date: date,
    ) -> list[date]:
        dates = []
        if recurrence == "weekly":
            current = template_date + timedelta(weeks=1)
            while current <= end_date:
                if current >= start_date:
                    dates.append(current)
                current += timedelta(weeks=1)
            return dates
        offset = 1
        current = cls._add_months(template_date, offset)
        while current <= end_date:
            if current >= start_date:
                dates.append(current)
            offset += 1
            current = cls._add_months(template_date, offset)
        return dates

    @classmethod
    def _fixed_dates(
        cls,
        billing_day: int,
        start_date: date,
        end_date: date,
    ) -> list[date]:
        current_month = start_date.replace(day=1)
        dates = []
        while current_month <= end_date:
            due_date = current_month.replace(day=min(
                billing_day,
                monthrange(current_month.year, current_month.month)[1],
            ))
            if start_date <= due_date <= end_date:
                dates.append(due_date)
            current_month = cls._add_months(current_month, 1)
        return dates

    @staticmethod
    def _add_months(source: date, months: int) -> date:
        month_index = source.month - 1 + months
        year = source.year + month_index // 12
        month = month_index % 12 + 1
        day = min(source.day, monthrange(year, month)[1])
        return date(year, month, day)

    @staticmethod
    def _validate_period(start_date: date, end_date: date) -> None:
        if start_date > end_date:
            raise DomainValidationError(
                "A data inicial não pode ser posterior à data final."
            )

    @staticmethod
    def _money(value) -> Decimal:
        return Decimal(str(value or 0)).quantize(CENT, rounding=ROUND_HALF_UP)

    @staticmethod
    def _as_date(value: date | datetime | None) -> date | None:
        if isinstance(value, datetime):
            return value.date()
        return value

    @staticmethod
    def _goal_result(goal, deadline, remaining, months, contribution) -> dict:
        return {
            "goal_id": goal.id,
            "goal_name": goal.name,
            "target_date": deadline.isoformat() if deadline else None,
            "remaining_amount": PlanningService._money(remaining),
            "months_remaining": months,
            "required_monthly_contribution": PlanningService._money(contribution),
            "status": goal.status,
        }
