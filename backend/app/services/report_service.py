from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from app.core.exceptions import DomainValidationError
from app.core.financial_domain import FINANCIAL_CATEGORIES
from app.repositories.transaction_repository import (
    TransactionRepository,
)


MONTH_LABELS = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
]
MONEY_QUANTUM = Decimal("0.01")
PERCENT_QUANTUM = Decimal("0.01")


class ReportService:
    """
    Relatórios agregados para a tela de Relatórios: tendência mensal,
    breakdown por categoria e tabela de saldo mensal.
    """

    def __init__(self):
        self.repository = TransactionRepository()

    def get_period_summary(
        self,
        db,
        start_date: date,
        end_date: date,
    ) -> dict:
        self._validate_period(start_date, end_date)
        row = self.repository.get_period_aggregate(db, start_date, end_date)
        total_income = self._money(row.total_income)
        total_expenses = self._money(row.total_expenses)
        return {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "total_income": total_income,
            "total_expenses": total_expenses,
            "balance": self._money(total_income - total_expenses),
            "transaction_count": int(row.transaction_count),
        }

    def compare_periods(
        self,
        db,
        first_start: date,
        first_end: date,
        second_start: date,
        second_end: date,
    ) -> dict:
        first = self.get_period_summary(db, first_start, first_end)
        second = self.get_period_summary(db, second_start, second_end)
        return {
            "first_period": first,
            "second_period": second,
            "changes": {
                field: self._change(first[field], second[field])
                for field in ("total_income", "total_expenses", "balance")
            },
        }

    def compare_category_periods(
        self,
        db,
        category: str,
        first_start: date,
        first_end: date,
        second_start: date,
        second_end: date,
    ) -> dict:
        if category not in FINANCIAL_CATEGORIES:
            raise DomainValidationError("Categoria financeira inválida.")
        self._validate_period(first_start, first_end)
        self._validate_period(second_start, second_end)
        first_total = self._money(
            self.repository.get_category_expense_total(
                db, category, first_start, first_end
            )
        )
        second_total = self._money(
            self.repository.get_category_expense_total(
                db, category, second_start, second_end
            )
        )
        return {
            "category": category,
            "first_period": {
                "start_date": first_start.isoformat(),
                "end_date": first_end.isoformat(),
                "total": first_total,
            },
            "second_period": {
                "start_date": second_start.isoformat(),
                "end_date": second_end.isoformat(),
                "total": second_total,
            },
            **self._change(first_total, second_total),
        }

    def get_top_expenses(
        self,
        db,
        start_date: date,
        end_date: date,
        limit: int = 5,
    ) -> list[dict]:
        self._validate_period(start_date, end_date)
        if not 1 <= limit <= 20:
            raise DomainValidationError("O limite deve estar entre 1 e 20.")
        return [
            {
                "transaction_id": item.id,
                "description": item.description,
                "category": item.category,
                "amount": self._money(item.amount),
                "due_date": item.due_date.isoformat(),
                "status": item.status,
            }
            for item in self.repository.get_top_expenses(
                db, start_date, end_date, limit
            )
        ]

    @staticmethod
    def _validate_period(start_date: date, end_date: date) -> None:
        if start_date > end_date:
            raise DomainValidationError(
                "A data inicial não pode ser posterior à data final."
            )

    @staticmethod
    def _money(value) -> Decimal:
        return Decimal(str(value or 0)).quantize(
            MONEY_QUANTUM, rounding=ROUND_HALF_UP
        )

    @staticmethod
    def _change(first: Decimal, second: Decimal) -> dict:
        difference = ReportService._money(second - first)
        percentage_change = None
        if first != 0:
            percentage_change = (
                difference / abs(first) * Decimal("100")
            ).quantize(PERCENT_QUANTUM, rounding=ROUND_HALF_UP)
        return {
            "difference": difference,
            "percentage_change": percentage_change,
        }

    def monthly_trend(
        self,
        db,
        months: int = 6,
    ) -> list[dict]:
        """
        Receitas vs. despesas dos últimos N meses (mais antigo primeiro),
        prontos para virar um gráfico de tendência.
        """

        rows = self.repository.get_monthly_totals(db, months)

        buckets: dict[str, dict] = {}

        today = date.today()
        for offset in range(months - 1, -1, -1):
            month_index = today.year * 12 + today.month - 1 - offset
            year, zero_month = divmod(month_index, 12)
            month = zero_month + 1
            key = f"{year:04d}-{month:02d}"
            buckets[key] = {
                "period": key,
                "month": MONTH_LABELS[month - 1],
                "year": year,
                "income": 0.0,
                "expense": 0.0,
            }

        for row_year, row_month, tx_type, total in rows:
            year = int(row_year)
            month = int(row_month)
            key = f"{year:04d}-{month:02d}"
            if key not in buckets:
                continue

            if tx_type == "income":
                buckets[key]["income"] = float(total)
            else:
                buckets[key]["expense"] = float(total)

        ordered = sorted(buckets.values(), key=lambda b: b["period"])

        return ordered[-months:]

    def monthly_balance_table(
        self,
        db,
        months: int = 6,
    ) -> list[dict]:
        """A mesma base do monthly_trend, mas já com o saldo calculado."""

        trend = self.monthly_trend(db, months)

        return [
            {
                **item,
                "balance": round(item["income"] - item["expense"], 2),
            }
            for item in trend
        ]

    def summary(self, db, months: int = 6) -> dict:
        """Resumo completo do período consumido pela tela de relatórios."""

        monthly = self.monthly_balance_table(db, months)
        income = round(sum(item["income"] for item in monthly), 2)
        expense = round(sum(item["expense"] for item in monthly), 2)
        categories = [
            {"category": category, "amount": float(total)}
            for category, total in self.repository.get_expense_totals_since(db, months)
        ]

        return {
            "monthly": monthly,
            "categories": categories,
            "totals": {
                "income": income,
                "expense": expense,
                "net": round(income - expense, 2),
            },
        }

    def category_breakdown(
        self,
        db,
        month: int | None = None,
        year: int | None = None,
    ) -> dict:
        """
        Total por categoria dentro de um mês/ano (padrão: mês atual),
        separado por receitas e despesas.
        """

        today = date.today()
        month = month or today.month
        year = year or today.year

        rows = self.repository.get_category_breakdown(db, month, year)

        expenses = []
        income = []

        for category, tx_type, total in rows:
            entry = {"category": category, "amount": float(total)}
            if tx_type == "expense":
                expenses.append(entry)
            else:
                income.append(entry)

        return {
            "month": month,
            "year": year,
            "expenses": expenses,
            "income": income,
        }
