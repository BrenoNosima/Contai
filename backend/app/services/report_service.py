from datetime import date

from app.repositories.transaction_repository import (
    TransactionRepository,
)


MONTH_LABELS = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
]


class ReportService:
    """
    Relatórios agregados para a tela de Relatórios: tendência mensal,
    breakdown por categoria e tabela de saldo mensal.
    """

    def __init__(self):
        self.repository = TransactionRepository()

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
