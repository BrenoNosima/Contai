import { useMemo, useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Plus, WalletCards } from "lucide-react"
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
import { dueLabel, parseDate } from "@/lib/dates"
import { cn } from "@/lib/utils"
import type { DashboardSummary, Transaction } from "@/lib/types"

export default function OverviewPage() {
  const [adding, setAdding] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const { create, update, setStatus } = useTransactionMutations()
  const now = new Date()
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd")
  const monthEnd = format(endOfMonth(now), "yyyy-MM-dd")
  const dashboard = useQuery({ queryKey: qk.dashboard, queryFn: dashboardApi.summary })
  const monthTransactions = useQuery({
    queryKey: qk.transactions({ scope: "overview-month", monthStart, monthEnd }),
    queryFn: () => transactionsApi.list({ status: "paid", start_date: monthStart, end_date: monthEnd }),
  })
  const pending = useQuery({
    queryKey: qk.transactions({ scope: "overview-upcoming" }),
    queryFn: () => transactionsApi.list({ type: "expense", status: "pending" }),
  })
  const selected = useQuery({
    queryKey: ["transaction", selectedId],
    queryFn: () => transactionsApi.get(selectedId!),
    enabled: selectedId !== null,
  })
  const upcoming = useMemo(() => [...(pending.data ?? [])].sort((a, b) => parseDate(a.due_date).getTime() - parseDate(b.due_date).getTime()), [pending.data])
  const loadingSummary = dashboard.isLoading || monthTransactions.isLoading
  const summaryError = dashboard.isError || monthTransactions.isError

  return <div className="min-w-0 overflow-x-clip animate-in">
    <PageHeader title="Visão geral" subtitle="Seu dinheiro agora, neste mês e nos próximos dias." actions={<Button variant="primary" size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" aria-hidden /> Novo lançamento</Button>} />

    {loadingSummary ? <LoadingState /> : summaryError ? <ErrorState message="Não foi possível carregar o resumo." onRetry={() => { dashboard.refetch(); monthTransactions.refetch() }} /> : dashboard.data && monthTransactions.data ? <>
      <div className="grid min-w-0 gap-4">
        <PositionCard data={dashboard.data} />
        <MonthSummary transactions={monthTransactions.data} />
      </div>
      <div className="mt-8">
        <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2">
        <UpcomingSection items={upcoming} loading={pending.isLoading} error={pending.isError} retry={() => pending.refetch()} onOpen={setSelectedId} />
        <RecentSection items={dashboard.data.recent_transactions} onOpen={setSelectedId} />
        </div>
      </div>
    </> : null}

    <Dialog open={adding} onClose={() => setAdding(false)} title="Novo lançamento" description="Registre uma receita ou despesa."><TransactionForm submitting={create.isPending} onCancel={() => setAdding(false)} onSubmit={(data) => create.mutate(data, { onSuccess: () => setAdding(false) })} /></Dialog>
    <Dialog open={selectedId !== null} onClose={() => setSelectedId(null)} title={selected.data?.description ?? "Detalhes do lançamento"}>
      {selected.isLoading ? <LoadingState /> : selected.isError ? <ErrorState message="Não foi possível carregar este lançamento." onRetry={() => selected.refetch()} /> : selected.data ? <OverviewTransactionDetails tx={selected.data} busy={setStatus.isPending} onEdit={() => { setEditing(selected.data); setSelectedId(null) }} onPaid={() => setStatus.mutate({ id: selected.data.id, status: "paid" }, { onSuccess: () => setSelectedId(null) })} /> : null}
    </Dialog>
    <Dialog open={editing !== null} onClose={() => setEditing(null)} title="Editar lançamento">
      {editing && <TransactionForm initial={editing} submitting={update.isPending} onCancel={() => setEditing(null)} onSubmit={(data) => update.mutate({ id: editing.id, data }, { onSuccess: () => setEditing(null) })} />}
    </Dialog>
  </div>
}

function PositionCard({ data }: { data: DashboardSummary }) {
  const balance = data.summary.balance
  return <Card className="min-w-0 overflow-hidden p-3.5 sm:p-5">
    <div className="flex items-center gap-2 text-xs text-muted sm:text-sm"><WalletCards className="h-4 w-4" aria-hidden /> Saldo disponível</div>
    <Money value={balance} type={balance < 0 ? "expense" : undefined} signed={balance < 0} className="mt-0.5 block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(1.55rem,8vw,2.25rem)] font-semibold tracking-[-0.035em]" />
    <p className="mt-1 text-[11px] text-subtle sm:text-xs">Lançamentos realizados desde o início</p>
    <div className="mt-3.5 grid grid-cols-2 divide-x divide-border border-t border-border pt-3 sm:mt-4 sm:pt-3.5">
      <CompactTotal label="Receitas realizadas" value={data.summary.total_income} type="income" icon={<ArrowDownLeft />} />
      <CompactTotal className="pl-3 sm:pl-5" label="Despesas realizadas" value={data.summary.total_expense} type="expense" icon={<ArrowUpRight />} />
    </div>
  </Card>
}

function CompactTotal({ label, value, type, icon, className }: { label: string; value: number; type: "income" | "expense"; icon: ReactNode; className?: string }) {
  return <div className={cn("min-w-0 overflow-hidden pr-2", className)}><div className="flex items-center gap-1.5 text-[11px] leading-4 text-muted sm:text-xs"><span className={cn("shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5", type === "income" ? "text-income" : "text-expense")}>{icon}</span><span className="truncate">{label}</span></div><Money value={value} type={type} className="mt-1 block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[13px] sm:text-base" /></div>
}

function MonthSummary({ transactions }: { transactions: Transaction[] }) {
  const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0)
  const expense = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0)
  const balance = income - expense
  const monthName = format(new Date(), "MMMM", { locale: ptBR })

  return <section className="min-w-0 border-y border-border py-4 sm:py-5">
    <div className="flex min-w-0 items-center justify-between gap-3">
      <h2 className="truncate text-sm font-semibold text-foreground">Resumo de <span className="capitalize">{monthName}</span></h2>
      <Link to="/relatorios" className="flex min-h-8 shrink-0 items-center gap-1 text-[11px] font-medium text-muted hover:text-foreground sm:text-xs">Ver detalhes<ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link>
    </div>
    <div className="mt-3 grid grid-cols-2 min-[380px]:grid-cols-3">
      <MonthMetric label="Receitas" value={income} type="income" />
      <MonthMetric label="Despesas" value={expense} type="expense" className="border-l border-border px-3 sm:px-5" />
      <MonthMetric label="Saldo do mês" value={balance} type={balance < 0 ? "expense" : "income"} className="col-span-2 mt-3 border-t border-border pt-3 min-[380px]:col-span-1 min-[380px]:mt-0 min-[380px]:border-l min-[380px]:border-t-0 min-[380px]:pl-3 min-[380px]:pt-0 sm:pl-5" signed />
    </div>
  </section>
}

function MonthMetric({ label, value, type, className, signed = false }: { label: string; value: number; type: "income" | "expense"; className?: string; signed?: boolean }) {
  return <div className={cn("min-w-0 pr-3 sm:pr-5", className)}><p className="truncate text-[11px] text-muted sm:text-xs">{label}</p><Money value={value} type={type} signed={signed} className="mt-1 block truncate text-xs sm:text-base" /></div>
}

function SectionHeader({ title, to, linkLabel, icon }: { title: string; to: string; linkLabel: string; icon?: ReactNode }) {
  return <div className="flex min-w-0 items-center justify-between gap-2"><h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">{icon && <span className="shrink-0">{icon}</span>}<span className="truncate">{title}</span></h3><Link to={to} className="flex min-h-8 shrink-0 items-center gap-1 text-xs font-medium text-muted hover:text-foreground">{linkLabel}<ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link></div>
}

function UpcomingSection({ items, loading, error, retry, onOpen }: { items: Transaction[]; loading: boolean; error: boolean; retry: () => void; onOpen: (id: number) => void }) {
  return <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface"><div className="px-4 py-2"><SectionHeader title="Próximos vencimentos" to="/calendario" linkLabel="Ver todos" /></div><div className="min-h-[192px] border-t border-border">{loading ? <LoadingState /> : error ? <ErrorState onRetry={retry} /> : items.length === 0 ? <CompactEmpty text="Nenhum vencimento próximo." /> : <div className="divide-y divide-border">{items.slice(0, 3).map((tx) => <UpcomingRow key={tx.id} tx={tx} onOpen={onOpen} />)}</div>}</div></section>
}

function UpcomingRow({ tx, onOpen }: { tx: Transaction; onOpen: (id: number) => void }) {
  const due = dueLabel(tx.due_date)
  const meta = categoryMeta(tx.category)
  const urgent = due.tone === "expense" || due.tone === "warning"
  return <ActivityRow description={tx.description} category={meta.label} date={tx.due_date} amount={tx.amount} type="expense" icon={meta.icon} iconTone={due.tone === "expense" ? "text-expense" : "text-warning"} status={urgent ? due.text : "A pagar"} statusTone={due.tone === "expense" ? "text-expense" : due.tone === "warning" ? "text-warning" : "text-muted"} installment={tx.installment_number ? `${tx.installment_number}/${tx.installment_count}` : undefined} onOpen={() => onOpen(tx.id)} />
}

function RecentSection({ items, onOpen }: { items: DashboardSummary["recent_transactions"]; onOpen: (id: number) => void }) {
  return <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface"><div className="px-4 py-2"><SectionHeader title="Movimentações recentes" to="/lancamentos" linkLabel="Ver todas" /></div><div className="min-h-[192px] border-t border-border">{items.length === 0 ? <CompactEmpty text="Nenhuma movimentação realizada." /> : <div className="divide-y divide-border">{items.slice(0, 3).map((tx) => { const meta = categoryMeta(tx.category); return <ActivityRow key={tx.id} description={tx.description} category={meta.label} date={tx.due_date} amount={tx.amount} type={tx.type} icon={meta.icon} iconTone={tx.type === "income" ? "text-income" : "text-expense"} status={tx.type === "income" ? "Recebido" : "Pago"} statusTone={tx.type === "income" ? "text-income" : "text-expense"} installment={tx.installment_number ? `${tx.installment_number}/${tx.installment_count}` : undefined} onOpen={() => onOpen(tx.id)} /> })}</div>}</div></section>
}

function ActivityRow({ description, category, date, amount, type, icon: Icon, iconTone, status, statusTone, installment, onOpen }: { description: string; category: string; date: string; amount: number; type: "income" | "expense"; icon: ReturnType<typeof categoryMeta>["icon"]; iconTone: string; status: string; statusTone: string; installment?: string; onOpen: () => void }) {
  return <button type="button" onClick={onOpen} aria-label={`Abrir detalhes de ${description}`} className="grid min-h-[64px] w-full min-w-0 grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2">
    <span className={cn("flex h-8 w-8 items-center justify-center", iconTone)}><Icon className="h-[18px] w-[18px]" aria-hidden /></span>
    <div className="min-w-0"><div className="flex min-w-0 items-center gap-1.5"><p className="truncate text-[13px] font-medium text-foreground sm:text-sm">{description}</p>{installment && <span className="shrink-0 text-[10px] text-subtle">{installment}</span>}</div><p className="mt-0.5 truncate text-[11px] text-muted sm:text-xs">{category} <span className="text-subtle" aria-hidden>·</span> {format(parseDate(date), "dd MMM", { locale: ptBR })}</p></div>
    <div className="min-w-0 max-w-28 text-right"><Money value={amount} type={type} signed={type === "income"} className="block overflow-hidden text-ellipsis whitespace-nowrap text-[13px] sm:text-sm" /><span className={cn("text-[11px] font-medium", statusTone)}>{status}</span></div>
  </button>
}

function OverviewTransactionDetails({ tx, busy, onEdit, onPaid }: { tx: Transaction; busy: boolean; onEdit: () => void; onPaid: () => void }) {
  const meta = categoryMeta(tx.category)
  return <div className="space-y-5">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0"><p className="truncate text-sm text-muted">{meta.label}</p><p className="mt-1 text-sm text-subtle">Vencimento em {format(parseDate(tx.due_date), "dd/MM/yyyy")}</p></div>
      <Money value={tx.amount} type={tx.type} signed className="shrink-0 text-xl" />
    </div>
    <div className="flex flex-col-reverse gap-2 sm:flex-row">
      <Button variant="secondary" className="flex-1" onClick={onEdit}>Editar lançamento</Button>
      {tx.type === "expense" && tx.status === "pending" && <Button variant="primary" className="flex-1" disabled={busy} onClick={onPaid}>{busy ? "Marcando…" : "Marcar como paga"}</Button>}
    </div>
  </div>
}

function CompactEmpty({ text }: { text: string }) {
  return <p className="flex h-full items-center justify-center px-3 py-4 text-center text-xs text-muted sm:px-4">{text}</p>
}
