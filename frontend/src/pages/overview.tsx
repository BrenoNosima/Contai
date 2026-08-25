import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import {
  TrendingUp,
  TrendingDown,
  Plus,
  CalendarClock,
  ArrowRight,
  Sparkles,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
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

      {/* Financial summary */}
      {dashboard.isLoading ? (
        <LoadingState />
      ) : dashboard.isError ? (
        <ErrorState
          message="Não foi possível carregar o resumo."
          onRetry={() => dashboard.refetch()}
        />
      ) : dashboard.data ? (
        <div className="grid gap-2.5 sm:gap-3 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="overflow-hidden p-3.5 sm:p-5">
            <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-subtle">
                  Posição atual
                </p>
                <p className="mt-1.5 text-xs text-muted sm:mt-2 sm:text-sm">Saldo disponível</p>
                <Money
                  value={dashboard.data.summary.balance}
                  type={dashboard.data.summary.balance < 0 ? "expense" : undefined}
                  className="tnum mt-1 block text-xl font-semibold tracking-[-0.025em] sm:text-[2rem]"
                />
            </div>

            <div className="mt-4 grid grid-cols-2 divide-x divide-border border-t border-border pt-3.5 sm:mt-5 sm:pt-4">
              <SummaryMetric
                label="Receitas acumuladas"
                value={dashboard.data.summary.total_income}
                tone="income"
                icon={TrendingUp}
              />
              <SummaryMetric
                label="Despesas acumuladas"
                value={dashboard.data.summary.total_expense}
                tone="expense"
                icon={TrendingDown}
                className="pl-4 sm:pl-5"
              />
            </div>
          </Card>

          <Card className="overflow-hidden p-3.5 sm:p-5" elevated={false}>
            <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-subtle">
                  Este mês
                </p>
                <p className="mt-1 text-xs text-muted sm:text-sm">Fluxo previsto e realizado</p>
            </div>
            <div className="mt-3 divide-y divide-border rounded-xl border border-border bg-background/35 px-3 sm:mt-4 sm:px-3.5">
              <MonthMetric
                label="Recebido"
                value={monthStats.received}
                tone="income"
                icon={TrendingUp}
              />
              <MonthMetric
                label="A pagar"
                value={monthStats.toPay}
                tone="expense"
                icon={CalendarClock}
              />
            </div>
          </Card>
        </div>
      ) : null}

      {/* Upcoming due */}
      <section className="mt-5 sm:mt-6">
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
            {upcoming.slice(0, 6).map((tx, index) => (
              <div key={tx.id} className={cn(index >= 3 && "hidden sm:block")}>
                <TransactionCard
                  tx={tx}
                  busy={setStatus.isPending}
                  onToggleStatus={toggleStatus}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent + insight teaser */}
      {dashboard.data && dashboard.data.recent_transactions.length > 0 && (
        <section className="mt-5 sm:mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              Movimentações recentes
            </h2>
          </div>
          <Card elevated={false} className="divide-y divide-border overflow-hidden p-0">
            {dashboard.data.recent_transactions.map((t, index) => (
              <div
                key={t.id}
                className={cn(
                  "flex items-center justify-between px-4 py-3 transition-colors hover:bg-surface-3/40 sm:py-3.5",
                  index >= 3 && "hidden sm:flex",
                )}
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
        className="group mt-5 flex items-center gap-3 overflow-hidden rounded-2xl border border-primary/20 bg-surface p-3.5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md sm:mt-6 sm:p-4"
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

function SummaryMetric({
  label,
  value,
  icon: Icon,
  tone,
  className,
}: {
  label: string
  value: number
  icon: LucideIcon
  tone: "income" | "expense"
  className?: string
}) {
  return (
    <div className={cn("min-w-0 pr-4 sm:pr-5", className)}>
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <Icon className={cn("h-3.5 w-3.5", tone === "income" ? "text-income" : "text-expense")} aria-hidden />
        <span className="truncate">{label}</span>
      </div>
      <Money
        value={value}
        type={tone}
        className="mt-1.5 block text-sm min-[380px]:text-base"
      />
    </div>
  )
}

function MonthMetric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: LucideIcon
  tone: "income" | "expense"
}) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-2.5 py-2.5 sm:min-h-16 sm:gap-3 sm:py-3">
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9", tone === "income" ? "bg-income-soft text-income" : "bg-expense-soft text-expense")}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <Money value={value} type={tone} className="shrink-0 text-sm min-[380px]:text-base" />
    </div>
  )
}
