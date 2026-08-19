import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { fixedExpensesApi, transactionsApi } from "@/lib/api"
import { qk } from "@/lib/query"
import { useTransactionMutations } from "@/lib/hooks"
import type { FixedExpense, Transaction } from "@/lib/types"
import { Button, Card, Money } from "@/components/ui/primitives"
import { Dialog } from "@/components/ui/dialog"
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states"
import { TransactionCard } from "@/components/transaction-card"
import { TransactionForm } from "@/components/transaction-form"
import { fmtLongDate, parseDate } from "@/lib/dates"
import { cn, formatMoney } from "@/lib/utils"

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"]

export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => new Date())
  const [selected, setSelected] = useState<Date | null>(null)
  const [addFor, setAddFor] = useState<string | null>(null)
  const { create, toggleStatus, setStatus } = useTransactionMutations()

  const monthStart = startOfMonth(cursor)
  const monthEnd = endOfMonth(cursor)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const days = useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    [gridStart.getTime(), gridEnd.getTime()],
  )

  const startISO = format(gridStart, "yyyy-MM-dd")
  const endISO = format(gridEnd, "yyyy-MM-dd")

  const txQuery = useQuery({
    queryKey: qk.transactions({ scope: "calendar", startISO, endISO }),
    queryFn: () =>
      transactionsApi.list({ start_date: startISO, end_date: endISO }),
  })
  const fixedExpensesQuery = useQuery({
    queryKey: qk.fixedExpenses,
    queryFn: fixedExpensesApi.listActive,
  })

  const byDay = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of txQuery.data ?? []) {
      const key = format(parseDate(t.due_date), "yyyy-MM-dd")
      const arr = map.get(key) ?? []
      arr.push(t)
      map.set(key, arr)
    }
    return map
  }, [txQuery.data])

  const fixedByDay = useMemo(() => {
    const map = new Map<string, FixedExpense[]>()
    const months = new Map<string, Date>()

    for (const day of days) {
      months.set(format(day, "yyyy-MM"), day)
    }

    for (const month of months.values()) {
      const lastDay = endOfMonth(month).getDate()
      for (const expense of fixedExpensesQuery.data ?? []) {
        const billingDate = new Date(
          month.getFullYear(),
          month.getMonth(),
          Math.min(expense.billing_day, lastDay),
        )
        const key = format(billingDate, "yyyy-MM-dd")
        const entries = map.get(key) ?? []
        entries.push(expense)
        map.set(key, entries)
      }
    }

    return map
  }, [days, fixedExpensesQuery.data])

  const selectedKey = selected ? format(selected, "yyyy-MM-dd") : null
  const selectedTx = selectedKey ? (byDay.get(selectedKey) ?? []) : []
  const selectedFixed = selectedKey ? (fixedByDay.get(selectedKey) ?? []) : []
  const monthItems = (txQuery.data ?? []).filter((transaction) =>
    isSameMonth(parseDate(transaction.due_date), cursor),
  )
  const pendingExpenses = monthItems.filter(
    (transaction) =>
      transaction.type === "expense" && transaction.status === "pending",
  )
  const pendingTotal = pendingExpenses.reduce(
    (total, transaction) => total + transaction.amount,
    0,
  )
  const monthlyFixed = fixedExpensesQuery.data ?? []
  const monthlyFixedTotal = monthlyFixed.reduce(
    (total, expense) => total + expense.amount,
    0,
  )
  const totalDueCount = pendingExpenses.length + monthlyFixed.length
  const totalDueAmount = pendingTotal + monthlyFixedTotal
  const calendarLoading = txQuery.isLoading || fixedExpensesQuery.isLoading
  const calendarError = txQuery.isError || fixedExpensesQuery.isError

  return (
    <div className="animate-in">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[color:var(--color-calendar-accent)]">
            Agenda financeira
          </p>
          <h1 className="mt-1 font-sans text-3xl font-semibold capitalize text-foreground">
            {format(cursor, "MMMM 'de' yyyy", { locale: ptBR })}
          </h1>
          {!calendarLoading && !calendarError && (
            <p className="mt-1.5 text-sm text-muted">
              {totalDueCount
                ? `${totalDueCount} conta${totalDueCount > 1 ? "s" : ""} a pagar · ${formatMoney(totalDueAmount)}`
                : "Nenhuma conta pendente neste mês"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="icon"
            variant="outline"
            aria-label="Mês anterior"
            onClick={() => setCursor((c) => subMonths(c, 1))}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCursor(new Date())}
          >
            Hoje
          </Button>
          <Button
            size="icon"
            variant="outline"
            aria-label="Próximo mês"
            onClick={() => setCursor((c) => addMonths(c, 1))}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      <Card elevated className="overflow-hidden border-[color:var(--color-calendar-border)] bg-[color:var(--color-calendar-surface)] p-0">
        {calendarLoading ? (
          <LoadingState label="Carregando o mês…" />
        ) : calendarError ? (
          <ErrorState
            onRetry={() => {
              txQuery.refetch()
              fixedExpensesQuery.refetch()
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[620px] sm:min-w-0">
              <div className="grid grid-cols-7 border-b border-[color:var(--color-calendar-border)] bg-[color:var(--color-calendar-header)]">
                {WEEKDAYS.map((d) => (
                  <div
                    key={d}
                    className="border-r border-[color:var(--color-calendar-border)] py-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted last:border-r-0"
                  >
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd")
                const items = byDay.get(key) ?? []
                const fixedItems = fixedByDay.get(key) ?? []
                const allItems = [
                  ...fixedItems.map((item) => ({ kind: "fixed" as const, item })),
                  ...items.map((item) => ({ kind: "transaction" as const, item })),
                ]
                const hasPending = items.some((t) => t.status === "pending")
                const inMonth = isSameMonth(day, cursor)
                const isSel = selected && isSameDay(day, selected)
                const visibleItems = allItems.slice(0, 3)
                return (
                  <button
                    key={key}
                    onClick={() => setSelected(day)}
                    aria-label={`${format(day, "dd 'de' MMMM", { locale: ptBR })}${
                      allItems.length ? `, ${allItems.length} lançamentos` : ""
                    }`}
                    aria-pressed={!!isSel}
                    className={cn(
                      "group relative min-h-[118px] border-b border-r border-[color:var(--color-calendar-border)] p-2 text-left text-sm transition-colors [@media(min-width:900px)]:min-h-[132px] [&:nth-child(7n)]:border-r-0",
                      inMonth
                        ? "bg-[color:var(--color-calendar-surface)] text-foreground"
                        : "bg-[color:var(--color-calendar-outside)] text-subtle/50",
                      isSel
                        ? "z-10 bg-[color:var(--color-calendar-selected)] shadow-[inset_0_0_0_2px_var(--color-calendar-accent)]"
                        : "hover:bg-[color:var(--color-calendar-hover)]",
                    )}
                  >
                    <span className="mb-2 flex items-center justify-between">
                      <span
                        className={cn(
                          "tnum flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-medium",
                          isToday(day) &&
                            "bg-[color:var(--color-calendar-accent)] font-semibold text-white shadow-sm",
                        )}
                      >
                        {format(day, "d")}
                      </span>
                      {allItems.length > 0 && (
                        <span className="text-[10px] text-subtle">
                          {allItems.length} {allItems.length === 1 ? "item" : "itens"}
                        </span>
                      )}
                    </span>
                    <span className="flex flex-col gap-1">
                      {visibleItems.map((entry) => (
                        <CalendarItem
                          key={`${entry.kind}-${entry.item.id}`}
                          entry={entry}
                        />
                      ))}
                      {allItems.length > visibleItems.length && (
                        <span className="px-1 text-[10px] font-medium text-muted">
                          +{allItems.length - visibleItems.length} outro{allItems.length - visibleItems.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </span>
                    {allItems.length > 0 && (
                      <span className="sr-only">
                        {hasPending ? "pendente" : "pago"}
                      </span>
                    )}
                  </button>
                )
              })}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 bg-[color:var(--color-calendar-header)] px-4 py-3 text-[11px] text-muted">
              <Legend tone="income" label="Receita" />
              <Legend tone="expense" label="Despesa" />
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-warning" />
                Pendente
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Day detail */}
      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? fmtLongDate(format(selected, "yyyy-MM-dd")) : ""}
        description={
          selectedTx.length + selectedFixed.length
            ? `${selectedTx.length + selectedFixed.length} lançamento${selectedTx.length + selectedFixed.length > 1 ? "s" : ""}`
            : "Nenhum lançamento neste dia."
        }
      >
        <div className="space-y-3">
          {selectedTx.length + selectedFixed.length > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3">
              <span className="text-xs text-muted">Total previsto do dia</span>
              <Money
                value={
                  selectedTx.reduce(
                    (acc, t) => acc + (t.type === "income" ? t.amount : -t.amount),
                    0,
                  ) - selectedFixed.reduce((acc, expense) => acc + expense.amount, 0)
                }
                type={
                  selectedTx.reduce(
                    (a, t) => a + (t.type === "income" ? t.amount : -t.amount),
                    0,
                  ) - selectedFixed.reduce((acc, expense) => acc + expense.amount, 0) < 0
                    ? "expense"
                    : "income"
                }
              />
            </div>
          )}

          {selectedTx.length === 0 && selectedFixed.length === 0 ? (
            <EmptyState
              title="Dia livre"
              description="Adicione um lançamento para esta data."
            />
          ) : (
            <div className="space-y-2">
              {selectedFixed.map((expense) => (
                <FixedExpenseDetail key={expense.id} expense={expense} />
              ))}
              {selectedTx.map((tx) => (
                <TransactionCard
                  key={tx.id}
                  tx={tx}
                  busy={setStatus.isPending}
                  onToggleStatus={toggleStatus}
                />
              ))}
            </div>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              if (selected) setAddFor(format(selected, "yyyy-MM-dd"))
            }}
          >
            <Plus className="h-4 w-4" aria-hidden /> Adicionar neste dia
          </Button>
        </div>
      </Dialog>

      {/* Add for a specific day */}
      <Dialog
        open={!!addFor}
        onClose={() => setAddFor(null)}
        title="Novo lançamento"
        description={addFor ? fmtLongDate(addFor) : undefined}
      >
        <TransactionForm
          defaultDate={addFor ?? undefined}
          submitting={create.isPending}
          onCancel={() => setAddFor(null)}
          onSubmit={(data) =>
            create.mutate(data, { onSuccess: () => setAddFor(null) })
          }
        />
      </Dialog>
    </div>
  )
}

type CalendarEntry =
  | { kind: "transaction"; item: Transaction }
  | { kind: "fixed"; item: FixedExpense }

function CalendarItem({ entry }: { entry: CalendarEntry }) {
  const isFixed = entry.kind === "fixed"
  const isExpense = isFixed || entry.item.type === "expense"
  const pending = isFixed || entry.item.status === "pending"
  const description = isFixed ? entry.item.name : entry.item.description

  return (
    <span
      className={cn(
        "flex min-w-0 items-center gap-1.5 rounded-md border-l-2 px-1.5 py-1 text-[10px] leading-tight",
        isExpense
          ? "border-l-[color:var(--color-calendar-expense)] bg-[color:var(--color-calendar-expense-soft)] text-[color:var(--color-calendar-expense-text)]"
          : "border-l-[color:var(--color-calendar-income)] bg-[color:var(--color-calendar-income-soft)] text-[color:var(--color-calendar-income-text)]",
        !pending && "opacity-55",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          pending ? "bg-warning" : "border border-current bg-transparent",
        )}
        aria-hidden
      />
      <span className={cn("min-w-0 flex-1 truncate", !pending && "line-through")}>
        {description}
      </span>
      <span className="tnum shrink-0 font-semibold">
        {formatMoney(entry.item.amount).replace(/\s/g, "")}
      </span>
    </span>
  )
}

function FixedExpenseDetail({ expense }: { expense: FixedExpense }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[color:var(--color-calendar-expense)]/25 bg-[color:var(--color-calendar-expense-soft)] p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-expense-soft text-expense">
        <span className="text-lg leading-none" aria-hidden>↻</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{expense.name}</p>
        <p className="mt-0.5 text-xs text-muted">Gasto fixo · {expense.category}</p>
      </div>
      <Money value={expense.amount} type="expense" />
    </div>
  )
}

function Legend({ tone, label }: { tone: "income" | "expense"; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full",
          tone === "income"
            ? "bg-[color:var(--color-calendar-income)]"
            : "bg-[color:var(--color-calendar-expense)]",
        )}
      />
      {label}
    </span>
  )
}
