import { useMemo, useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarClock, Plus, Sparkles, WalletCards } from "lucide-react"
import { endOfMonth, format, startOfMonth } from "date-fns"
import { ptBR } from "date-fns/locale"
import { dashboardApi, transactionsApi } from "@/lib/api"
import { qk } from "@/lib/query"
import { useTransactionMutations } from "@/lib/hooks"
import { PageHeader } from "@/components/page-header"
import { Button, Card, Money } from "@/components/ui/primitives"
import { Dialog } from "@/components/ui/dialog"
import { ErrorState, LoadingState } from "@/components/ui/states"
import { TransactionForm } from "@/components/transaction-form"
import { categoryMeta } from "@/lib/categories"
import { dueLabel, parseDate, todayISO } from "@/lib/dates"
import { cn, formatMoney } from "@/lib/utils"
import type { DashboardSummary, Transaction } from "@/lib/types"

export default function OverviewPage() {
  const [adding, setAdding] = useState(false)
  const { create } = useTransactionMutations()
  const now = new Date()
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd")
  const monthEnd = format(endOfMonth(now), "yyyy-MM-dd")
  const dashboard = useQuery({ queryKey: qk.dashboard, queryFn: dashboardApi.summary })
  const monthExpenses = useQuery({
    queryKey: qk.transactions({ scope: "overview-month-expenses", monthStart, monthEnd }),
    queryFn: () => transactionsApi.list({ type: "expense", status: "paid", start_date: monthStart, end_date: monthEnd }),
  })
  const pending = useQuery({
    queryKey: qk.transactions({ scope: "overview-upcoming", from: todayISO() }),
    queryFn: () => transactionsApi.list({ type: "expense", status: "pending", start_date: todayISO() }),
  })
  const upcoming = useMemo(() => [...(pending.data ?? [])].sort((a, b) => parseDate(a.due_date).getTime() - parseDate(b.due_date).getTime()).slice(0, 3), [pending.data])
  const loadingSummary = dashboard.isLoading || monthExpenses.isLoading
  const summaryError = dashboard.isError || monthExpenses.isError

  return <div className="min-w-0 overflow-x-clip animate-in">
    <PageHeader title="Visão geral" subtitle="Seu dinheiro agora, neste mês e nos próximos dias." actions={<Button variant="primary" size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" aria-hidden /> Novo lançamento</Button>} />

    {loadingSummary ? <LoadingState /> : summaryError ? <ErrorState message="Não foi possível carregar o resumo." onRetry={() => { dashboard.refetch(); monthExpenses.refetch() }} /> : dashboard.data && monthExpenses.data ? <>
      <div className="grid min-w-0 gap-3 sm:gap-4">
        <PositionCard data={dashboard.data} />
        <MonthCard expenses={monthExpenses.data} />
      </div>
      <div className="mt-5 grid min-w-0 items-start gap-5 lg:grid-cols-2 lg:gap-4">
        <UpcomingSection items={upcoming} loading={pending.isLoading} error={pending.isError} retry={() => pending.refetch()} />
        <RecentSection items={dashboard.data.recent_transactions} />
      </div>
    </> : null}

    <Link to="/assistente" className="group mt-5 flex min-h-16 items-center gap-3 overflow-hidden rounded-2xl border border-primary/20 bg-surface p-3.5 shadow-sm transition-colors hover:border-primary/40 sm:p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles className="h-[18px] w-[18px]" aria-hidden /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-foreground">Fale com seu assistente</span><span className="block truncate text-xs text-muted">&quot;Quais contas estão pendentes este mês?&quot;</span></span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
    </Link>

    <Dialog open={adding} onClose={() => setAdding(false)} title="Novo lançamento" description="Registre uma receita ou despesa."><TransactionForm submitting={create.isPending} onCancel={() => setAdding(false)} onSubmit={(data) => create.mutate(data, { onSuccess: () => setAdding(false) })} /></Dialog>
  </div>
}

function PositionCard({ data }: { data: DashboardSummary }) {
  const balance = data.summary.balance
  return <Card className="min-w-0 overflow-hidden p-3.5 sm:p-5">
    <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-subtle sm:text-xs"><WalletCards className="h-4 w-4" aria-hidden /> Posição atual</div>
    <p className="mt-2 text-xs text-muted sm:mt-2.5 sm:text-sm">Saldo disponível</p>
    <Money value={balance} type={balance < 0 ? "expense" : undefined} signed={balance < 0} className="mt-0.5 block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(1.55rem,8vw,2.25rem)] font-semibold tracking-[-0.035em]" />
    <div className="mt-3.5 grid grid-cols-2 divide-x divide-border border-t border-border pt-3 sm:mt-4 sm:pt-3.5">
      <CompactTotal label="Receitas" value={data.summary.total_income} type="income" icon={<ArrowDownLeft />} />
      <CompactTotal className="pl-3 sm:pl-5" label="Despesas" value={data.summary.total_expense} type="expense" icon={<ArrowUpRight />} />
    </div>
  </Card>
}

function CompactTotal({ label, value, type, icon, className }: { label: string; value: number; type: "income" | "expense"; icon: ReactNode; className?: string }) {
  return <div className={cn("min-w-0 overflow-hidden pr-2", className)}><div className="flex items-center gap-1.5 text-[11px] leading-4 text-muted sm:text-xs"><span className={cn("shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5", type === "income" ? "text-income" : "text-expense")}>{icon}</span><span className="truncate">{label} acumuladas</span></div><Money value={value} type={type} className="mt-1 block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[13px] sm:text-base" /></div>
}

function MonthCard({ expenses }: { expenses: Transaction[] }) {
  const categories = useMemo(() => {
    const totals = new Map<string, number>()
    for (const expense of expenses) totals.set(expense.category, (totals.get(expense.category) ?? 0) + expense.amount)
    return [...totals.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount).slice(0, 3)
  }, [expenses])
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const monthName = format(new Date(), "MMMM", { locale: ptBR })

  return <Card elevated={false} className="min-w-0 overflow-hidden p-3.5 sm:p-5">
    <div className="flex min-w-0 items-center justify-between gap-3">
      <p className="truncate text-[11px] font-medium text-subtle sm:text-xs">Resumo de <span className="capitalize">{monthName}</span></p>
      <Link to="/relatorios" className="flex min-h-8 shrink-0 items-center gap-1 text-[11px] font-medium text-muted hover:text-foreground sm:text-xs">Ver detalhes<ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link>
    </div>
    <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-border pt-2.5 sm:mt-3 sm:pt-3">
      <span className="text-xs text-muted sm:text-sm">Gastos no mês</span>
      <Money value={total} type="expense" className="shrink-0 text-sm font-semibold sm:text-base" />
    </div>
    {categories.length > 0 ? <div className="mt-2.5 space-y-2 sm:mt-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0">
      {categories.map((item) => <div key={item.category} className="grid min-w-0 grid-cols-[minmax(4.75rem,0.8fr)_minmax(3rem,1.25fr)_auto] items-center gap-2 sm:block">
        <span className="truncate text-[11px] text-muted sm:block sm:text-xs">{item.category}</span>
        <span className="h-1.5 overflow-hidden rounded-full bg-surface-3 sm:mt-1.5 sm:block" aria-hidden><span className="block h-full rounded-full bg-expense/65" style={{ width: `${total > 0 ? (item.amount / total) * 100 : 0}%` }} /></span>
        <span className="text-right text-[11px] font-medium text-foreground tnum sm:mt-1 sm:block sm:text-left sm:text-xs">{formatMoney(item.amount)}</span>
      </div>)}
    </div> : <p className="mt-2.5 text-xs text-subtle">Nenhum gasto realizado neste mês.</p>}
  </Card>
}

function SectionHeader({ title, to, linkLabel, icon }: { title: string; to: string; linkLabel: string; icon?: ReactNode }) {
  return <div className="mb-2.5 flex min-w-0 items-center justify-between gap-2"><h2 className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-foreground sm:text-base">{icon && <span className="shrink-0">{icon}</span>}<span className="truncate">{title}</span></h2><Link to={to} className="flex min-h-8 shrink-0 items-center gap-1 text-[11px] font-medium text-muted hover:text-foreground sm:text-xs">{linkLabel}<ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link></div>
}

function UpcomingSection({ items, loading, error, retry }: { items: Transaction[]; loading: boolean; error: boolean; retry: () => void }) {
  return <section className="min-w-0"><SectionHeader title="Próximos vencimentos" to="/calendario" linkLabel="Ver todos" icon={<CalendarClock className="h-4 w-4 text-warning" aria-hidden />} />{loading ? <Card elevated={false} className="py-3"><LoadingState /></Card> : error ? <Card elevated={false} className="py-3"><ErrorState onRetry={retry} /></Card> : items.length === 0 ? <Card elevated={false} className="p-0"><CompactEmpty text="Nenhum vencimento próximo." /></Card> : <div className="space-y-2">{items.map((tx) => <UpcomingRow key={tx.id} tx={tx} />)}</div>}</section>
}

function UpcomingRow({ tx }: { tx: Transaction }) {
  const due = dueLabel(tx.due_date)
  const meta = categoryMeta(tx.category)
  const Icon = meta.icon
  return <article className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-2.5 rounded-2xl border border-border bg-surface-2/70 p-3 transition-colors hover:border-border-strong hover:bg-surface-2">
    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-soft text-warning"><Icon className="h-[18px] w-[18px]" aria-hidden /></span>
    <div className="min-w-0"><div className="flex min-w-0 items-center gap-1.5"><p className="truncate text-[13px] font-medium text-foreground sm:text-sm">{tx.description}</p>{tx.installment_number && <span className="shrink-0 text-[10px] text-subtle">{tx.installment_number}/{tx.installment_count}</span>}</div><p className="mt-0.5 truncate text-[11px] text-muted sm:text-xs">{meta.label} <span className="text-subtle" aria-hidden>·</span> <span className={due.tone === "expense" ? "text-expense" : "text-warning"}>{format(parseDate(tx.due_date), "dd MMM", { locale: ptBR })}</span></p></div>
    <div className="min-w-0 max-w-28 text-right"><Money value={tx.amount} type="expense" className="block overflow-hidden text-ellipsis whitespace-nowrap text-[13px] sm:text-sm" /><span className="text-[10px] font-medium text-warning">A pagar</span></div>
  </article>
}

function RecentSection({ items }: { items: DashboardSummary["recent_transactions"] }) {
  return <section className="min-w-0"><SectionHeader title="Movimentações recentes" to="/lancamentos" linkLabel="Ver todas" /><Card elevated={false} className="overflow-hidden p-0">{items.length === 0 ? <CompactEmpty text="Nenhuma movimentação realizada." /> : <div className="divide-y divide-border">{items.slice(0, 3).map((tx) => <div key={tx.id} className="flex min-w-0 items-center justify-between gap-3 px-3.5 py-3 sm:px-4"><div className="min-w-0"><div className="flex min-w-0 items-center gap-1.5"><p className="truncate text-[13px] font-medium text-foreground sm:text-sm">{tx.description}</p>{tx.installment_number && <span className="shrink-0 text-[10px] text-subtle">{tx.installment_number}/{tx.installment_count}</span>}</div><p className="mt-0.5 truncate text-[11px] text-muted sm:text-xs">{tx.category}</p></div><Money value={tx.amount} type={tx.type} signed className="max-w-32 shrink-0 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] sm:text-sm" /></div>)}</div>}</Card></section>
}

function CompactEmpty({ text }: { text: string }) {
  return <p className="px-3 py-4 text-center text-xs text-muted sm:px-4">{text}</p>
}
