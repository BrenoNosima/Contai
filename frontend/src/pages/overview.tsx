import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  CalendarClock,
  ArrowRight,
  Sparkles,
} from "lucide-react"
import { endOfMonth, startOfMonth, format } from "date-fns"
import { dashboardApi, transactionsApi } from "@/lib/api"
import { qk } from "@/lib/query"
import { useTransactionMutations } from "@/lib/hooks"
import { PageHeader } from "@/components/page-header"
import { Button, Card, Money } from "@/components/ui/primitives"
import { Dialog } from "@/components/ui/dialog"
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states"
import { TransactionCard } from "@/components/transaction-card"
import { TransactionForm } from "@/components/transaction-form"
import { isOverdue, parseDate } from "@/lib/dates"
import { cn } from "@/lib/utils"

export default function OverviewPage() {
  const [adding, setAdding] = useState(false)
  const { create, toggleStatus, setStatus } = useTransactionMutations()

  const dashboard = useQuery({
    queryKey: qk.dashboard,
    queryFn: dashboardApi.summary,
  })

  const now = new Date()
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd")
  const monthEnd = format(endOfMonth(now), "yyyy-MM-dd")

  const monthTx = useQuery({
    queryKey: qk.transactions({ scope: "overview-month", monthStart, monthEnd }),
    queryFn: () =>
      transactionsApi.list({ start_date: monthStart, end_date: monthEnd }),
  })

  const pending = useQuery({
    queryKey: qk.transactions({ scope: "overview-pending" }),
    queryFn: () => transactionsApi.list({ status: "pending" }),
  })

  const monthStats = useMemo(() => {
    const list = monthTx.data ?? []
    let received = 0
    let toPay = 0
    for (const t of list) {
      if (t.type === "income" && t.status === "paid") received += t.amount
      if (t.type === "expense" && t.status === "pending") toPay += t.amount
    }
    return { received, toPay }
  }, [monthTx.data])

  const upcoming = useMemo(() => {
    const list = (pending.data ?? []).filter((t) => t.type === "expense")
    return [...list].sort(
      (a, b) => parseDate(a.due_date).getTime() - parseDate(b.due_date).getTime(),
    )
  }, [pending.data])

  const overdueCount = upcoming.filter((t) => isOverdue(t.due_date)).length

  return (
    <div className="animate-in">
      <PageHeader
        title="Visão geral"
        subtitle="Seu resumo financeiro e o que precisa de atenção."
        actions={
          <Button variant="primary" size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" aria-hidden /> Novo lançamento
          </Button>
        }
      />

      {/* Balance cards */}
      {dashboard.isLoading ? (
        <LoadingState />
      ) : dashboard.isError ? (
        <ErrorState
          message="Não foi possível carregar o resumo."
          onRetry={() => dashboard.refetch()}
        />
      ) : dashboard.data ? (
        <>
          <div className="grid grid-cols-6 gap-3">
            <BalanceCard
              label="Saldo atual"
              value={dashboard.data.summary.balance}
              icon={Wallet}
              highlight
            />
            <StatCard
              label="Total de receitas"
              value={dashboard.data.summary.total_income}
              icon={TrendingUp}
              tone="income"
            />
            <StatCard
              label="Total de despesas"
              value={dashboard.data.summary.total_expense}
              icon={TrendingDown}
              tone="expense"
            />
          </div>

          {/* Month stats */}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Card className="group overflow-hidden transition-colors hover:border-income/30" elevated={false}>
              <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted">Recebido no mês</p>
                <Money
                  value={monthStats.received}
                  type="income"
                  className="mt-1 text-xl"
                />
              </div>
              <span className="rounded-lg bg-income-soft p-2 text-income">
                <TrendingUp className="h-5 w-5" aria-hidden />
              </span>
              </div>
            </Card>
            <Card className="group overflow-hidden transition-colors hover:border-expense/30" elevated={false}>
              <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted">A pagar no mês</p>
                <Money
                  value={monthStats.toPay}
                  type="expense"
                  className="mt-1 text-xl"
                />
              </div>
              <span className="rounded-lg bg-expense-soft p-2 text-expense">
                <CalendarClock className="h-5 w-5" aria-hidden />
              </span>
              </div>
            </Card>
          </div>
        </>
      ) : null}

      {/* Upcoming due */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <CalendarClock className="h-4 w-4 text-warning" aria-hidden />
            Próximos vencimentos
            {overdueCount > 0 && (
              <span className="rounded-full bg-expense-soft px-2 py-0.5 text-xs font-medium text-expense">
                {overdueCount} vencida{overdueCount > 1 ? "s" : ""}
              </span>
            )}
          </h2>
          <Link
            to="/lancamentos"
            className="flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground"
          >
            Ver todos <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        {pending.isLoading ? (
          <LoadingState />
        ) : pending.isError ? (
          <ErrorState onRetry={() => pending.refetch()} />
        ) : upcoming.length === 0 ? (
          <Card elevated={false}>
            <EmptyState
              title="Nenhuma conta pendente"
              description="Tudo em dia por aqui. Novos vencimentos aparecerão aqui automaticamente."
            />
          </Card>
        ) : (
          <div className="space-y-2">
            {upcoming.slice(0, 6).map((tx) => (
              <TransactionCard
                key={tx.id}
                tx={tx}
                busy={setStatus.isPending}
                onToggleStatus={toggleStatus}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recent + insight teaser */}
      {dashboard.data && dashboard.data.recent_transactions.length > 0 && (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              Movimentações recentes
            </h2>
          </div>
          <Card elevated={false} className="divide-y divide-border overflow-hidden p-0">
            {dashboard.data.recent_transactions.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-surface-3/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">
                    {t.description}
                  </p>
                  <p className="text-xs text-muted">{t.category}</p>
                </div>
                <Money value={t.amount} type={t.type} signed />
              </div>
            ))}
          </Card>
        </section>
      )}

      <Link
        to="/assistente"
        className="group mt-6 flex items-center gap-3 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-surface-2 to-surface-2 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Sparkles className="h-5 w-5" aria-hidden />
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            Fale com seu assistente
          </p>
          <p className="text-xs text-muted">
            "Quais contas estão pendentes esse mês?"
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-1 group-hover:text-primary" aria-hidden />
      </Link>

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Novo lançamento"
        description="Registre uma receita ou despesa."
      >
        <TransactionForm
          submitting={create.isPending}
          onCancel={() => setAdding(false)}
          onSubmit={(data) =>
            create.mutate(data, { onSuccess: () => setAdding(false) })
          }
        />
      </Dialog>
    </div>
  )
}

function BalanceCard({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string
  value: number
  icon: typeof Wallet
  highlight?: boolean
}) {
  return (
    <Card
      className={cn(
        "relative col-span-full min-h-40 overflow-hidden lg:col-span-2",
        highlight && "border-[color:var(--color-primary)]/30",
      )}
    >
      <div className="relative z-10 flex items-center justify-between">
        <p className="text-xs text-muted">{label}</p>
        <span
          className={cn(
            "rounded-lg p-1.5",
            highlight ? "bg-primary/15 text-primary" : "bg-surface-3 text-muted",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <Money
        value={value}
        type={value < 0 ? "expense" : undefined}
        className="relative z-10 mt-4 block text-3xl sm:text-4xl"
      />
    </Card>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: typeof Wallet
  tone: "income" | "expense"
}) {
  return (
    <Card className="col-span-full min-h-40 overflow-hidden transition-all hover:-translate-y-0.5 hover:border-border-strong sm:col-span-3 lg:col-span-2">
      <div className="relative z-10 flex items-center justify-between">
        <p className="text-xs text-muted">{label}</p>
        <span
          className={cn(
            "rounded-lg p-1.5",
            tone === "income"
              ? "bg-income-soft text-income"
              : "bg-expense-soft text-expense",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <Money value={value} type={tone} className="relative z-10 mt-8 block text-2xl lg:text-3xl" />
    </Card>
  )
}
