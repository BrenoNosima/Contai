import { Check, Repeat2, Pencil, Trash2 } from "lucide-react"
import type { Transaction } from "@/lib/types"
import { categoryMeta } from "@/lib/categories"
import { Money, Badge } from "@/components/ui/primitives"
import { dueLabel } from "@/lib/dates"
import { cn } from "@/lib/utils"

const PRIORITY_LABEL: Record<string, string> = {
  essential: "Essencial",
  desirable: "Desejável",
  superfluous: "Supérfluo",
}

export function TransactionCard({
  tx,
  onToggleStatus,
  onEdit,
  onDelete,
  busy,
  showDue = true,
}: {
  tx: Transaction
  onToggleStatus?: (tx: Transaction) => void
  onEdit?: (tx: Transaction) => void
  onDelete?: (tx: Transaction) => void
  busy?: boolean
  showDue?: boolean
}) {
  const meta = categoryMeta(tx.category)
  const Icon = meta.icon
  const isIncome = tx.type === "income"
  const paid = tx.status === "paid"
  const due = dueLabel(tx.due_date)
  const completedLabel = isIncome ? "Recebida" : "Paga"

  return (
    <div
      className={cn(
        "group flex items-start gap-2.5 rounded-2xl border border-border bg-surface-2/70 p-3 transition-[background-color,border-color,box-shadow] duration-200 hover:border-border-strong hover:bg-surface-2 hover:shadow-lg sm:items-center sm:gap-3 sm:p-3.5",
        !paid && !isIncome && due.tone === "expense" && "border-[color:var(--color-expense)]/40",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.03] sm:h-11 sm:w-11 sm:rounded-[14px]",
          isIncome ? "bg-income-soft text-income" : "bg-surface-3 text-muted",
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium text-foreground">
            {tx.description}
          </p>
          {(tx.parent_id != null || tx.fixed_expense_id != null) && (
            <span title="Ocorrência recorrente" className="text-subtle">
              <Repeat2 className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">Ocorrência recorrente</span>
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted">{meta.label}</span>
          {showDue && (
            <>
              <span className="text-subtle" aria-hidden>·</span>
              <span
                className={cn(
                  "text-xs",
                  !paid && due.tone === "expense" && "text-expense",
                  !paid && due.tone === "warning" && "text-warning",
                  (paid || due.tone === "neutral") && "text-subtle",
                )}
              >
                {paid ? completedLabel : isIncome ? "A receber" : due.text}
              </span>
            </>
          )}
          {tx.priority && !isIncome && (
            <Badge tone="muted">{PRIORITY_LABEL[tx.priority]}</Badge>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <Money value={tx.amount} type={tx.type} signed className="amount-value" />
        <div className="flex items-center gap-1">
          {onToggleStatus && (
            <button
              onClick={() => onToggleStatus(tx)}
              disabled={busy}
              aria-label={
                isIncome
                  ? paid ? "Marcar como a receber" : "Marcar como recebida"
                  : paid ? "Marcar como pendente" : "Marcar como paga"
              }
              title={
                isIncome
                  ? paid ? "Marcar como a receber" : "Marcar como recebida"
                  : paid ? "Marcar como pendente" : "Marcar como paga"
              }
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl border transition-colors disabled:opacity-50 sm:h-8 sm:w-8 sm:rounded-lg",
                paid
                  ? "border-[color:var(--color-income)]/40 bg-income-soft text-income"
                  : "border-border bg-surface-3 text-muted hover:text-foreground",
              )}
            >
              {paid ? <Check className="h-4 w-4" aria-hidden /> : <span className="h-3.5 w-3.5 rounded-full border-2 border-current" aria-hidden />}
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(tx)}
              aria-label="Editar lançamento"
              className="flex h-11 w-11 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-3 hover:text-foreground"
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(tx)}
              aria-label="Excluir lançamento"
              className="flex h-11 w-11 items-center justify-center rounded-xl text-muted transition-colors hover:bg-expense-soft hover:text-expense"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
