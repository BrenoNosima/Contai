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
import { transactionsApi } from "@/lib/api"
import { qk } from "@/lib/query"
import { useTransactionMutations } from "@/lib/hooks"
import type { Transaction } from "@/lib/types"
import { Button, Card, Money } from "@/components/ui/primitives"
import { Dialog } from "@/components/ui/dialog"
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states"
import { TransactionCard } from "@/components/transaction-card"
import { TransactionForm } from "@/components/transaction-form"
import { fmtLongDate, parseDate } from "@/lib/dates"
import { cn } from "@/lib/utils"

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

  const selectedKey = selected ? format(selected, "yyyy-MM-dd") : null
  const selectedTx = selectedKey ? (byDay.get(selectedKey) ?? []) : []

  return (
    <div className="animate-in">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted">Calendário</p>
          <h1 className="mt-1 font-sans text-3xl font-semibold capitalize text-foreground">
            {format(cursor, "MMMM 'de' yyyy", { locale: ptBR })}
          </h1>
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

      <Card elevated className="p-3 sm:p-4">
        {txQuery.isLoading ? (
          <LoadingState label="Carregando o mês…" />
        ) : txQuery.isError ? (
          <ErrorState onRetry={() => txQuery.refetch()} />
        ) : (
          <>
            <div className="mb-2 grid grid-cols-7 gap-1">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="py-1 text-center text-[11px] font-medium uppercase tracking-wide text-subtle"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd")
                const items = byDay.get(key) ?? []
                const hasIncome = items.some((t) => t.type === "income")
                const hasExpense = items.some((t) => t.type === "expense")
                const hasPending = items.some((t) => t.status === "pending")
                const inMonth = isSameMonth(day, cursor)
                const isSel = selected && isSameDay(day, selected)
                return (
                  <button
                    key={key}
                    onClick={() => setSelected(day)}
                    aria-label={`${format(day, "dd 'de' MMMM", { locale: ptBR })}${
                      items.length ? `, ${items.length} lançamentos` : ""
                    }`}
                    aria-pressed={!!isSel}
                    className={cn(
                      "relative flex min-h-[52px] flex-col items-center justify-start gap-1 rounded-lg border p-1.5 text-sm transition-colors sm:min-h-[64px]",
                      inMonth ? "text-foreground" : "text-subtle/60",
                      isSel
                        ? "border-primary bg-surface-3"
                        : "border-transparent hover:border-border hover:bg-surface-2",
                      isToday(day) && !isSel && "border-border-strong",
                    )}
                  >
                    <span
                      className={cn(
                        "tnum flex h-6 w-6 items-center justify-center rounded-full text-xs",
                        isToday(day) &&
                          "bg-primary font-semibold text-primary-foreground",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {(hasIncome || hasExpense) && (
                      <span className="flex items-center gap-0.5">
                        {hasIncome && (
                          <Dot tone="income" hollow={!items.some((t) => t.type === "income" && t.status === "pending")} />
                        )}
                        {hasExpense && (
                          <Dot tone="expense" hollow={!items.some((t) => t.type === "expense" && t.status === "pending")} />
                        )}
                      </span>
                    )}
                    {items.length > 0 && (
                      <span className="sr-only">
                        {hasPending ? "pendente" : "pago"}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-[11px] text-muted">
              <Legend tone="income" label="Receita" />
              <Legend tone="expense" label="Despesa" />
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full border-2 border-neutral" />
                Contorno = pago
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-neutral" />
                Preenchido = pendente
              </span>
            </div>
          </>
        )}
      </Card>

      {/* Day detail */}
      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? fmtLongDate(format(selected, "yyyy-MM-dd")) : ""}
        description={
          selectedTx.length
            ? `${selectedTx.length} lançamento${selectedTx.length > 1 ? "s" : ""}`
            : "Nenhum lançamento neste dia."
        }
      >
        <div className="space-y-3">
          {selectedTx.length > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3">
              <span className="text-xs text-muted">Saldo do dia</span>
              <Money
                value={selectedTx.reduce(
                  (acc, t) => acc + (t.type === "income" ? t.amount : -t.amount),
                  0,
                )}
                type={
                  selectedTx.reduce(
                    (a, t) => a + (t.type === "income" ? t.amount : -t.amount),
                    0,
                  ) < 0
                    ? "expense"
                    : "income"
                }
              />
            </div>
          )}

          {selectedTx.length === 0 ? (
            <EmptyState
              title="Dia livre"
              description="Adicione um lançamento para esta data."
            />
          ) : (
            <div className="space-y-2">
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

function Dot({ tone, hollow }: { tone: "income" | "expense"; hollow?: boolean }) {
  return (
    <span
      className={cn(
        "h-2 w-2 rounded-full",
        tone === "income"
          ? hollow
            ? "border-2 border-income"
            : "bg-income"
          : hollow
            ? "border-2 border-expense"
            : "bg-expense",
      )}
      aria-hidden
    />
  )
}

function Legend({ tone, label }: { tone: "income" | "expense"; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full",
          tone === "income" ? "bg-income" : "bg-expense",
        )}
      />
      {label}
    </span>
  )
}
