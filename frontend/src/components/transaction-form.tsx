import { useState, type FormEvent } from "react"
import type {
  Transaction,
  TransactionCreate,
  TransactionType,
  Priority,
  Recurrence,
  TransactionStatus,
} from "@/lib/types"
import {
  Button,
  Input,
  Label,
  Select,
} from "@/components/ui/primitives"
import { useFinanceMetadata } from "@/lib/metadata"
import { todayISO } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

export function TransactionForm({
  initial,
  defaultDate,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial?: Transaction
  defaultDate?: string
  onSubmit: (data: TransactionCreate) => void
  onCancel: () => void
  submitting?: boolean
}) {
  const metadata = useFinanceMetadata()
  const [type, setType] = useState<TransactionType>(initial?.type ?? "expense")
  const [status, setStatus] = useState<TransactionStatus>(
    initial?.status ?? "pending",
  )
  const [description, setDescription] = useState(initial?.description ?? "")
  const [category, setCategory] = useState(initial?.category ?? "")
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "")
  const [priority, setPriority] = useState<Priority | "">(
    initial?.priority ?? "",
  )
  const [dueDate, setDueDate] = useState(
    initial?.due_date ?? defaultDate ?? todayISO(),
  )
  const [recurrence, setRecurrence] = useState<Recurrence | "">(
    initial?.recurrence ?? "",
  )

  const amountNum = Number(amount.replace(",", "."))
  const valid = description.trim() && category.trim() && amountNum > 0

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!valid) return
    onSubmit({
      type,
      description: description.trim(),
      category: category.trim(),
      amount: amountNum,
      status,
      priority: type === "expense" && priority ? priority : null,
      due_date: dueDate,
      is_recurring: recurrence !== "",
      recurrence: recurrence || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type toggle */}
      <div className="grid grid-cols-2 gap-2">
        {(["expense", "income"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            aria-pressed={type === t}
            className={cn(
              "h-11 rounded-xl border text-sm font-medium transition-colors",
              type === t
                ? t === "income"
                  ? "border-[color:var(--color-income)]/50 bg-income-soft text-income"
                  : "border-[color:var(--color-expense)]/50 bg-expense-soft text-expense"
                : "border-border bg-surface-2 text-muted hover:text-foreground",
            )}
          >
            {t === "income" ? "Receita" : "Despesa"}
          </button>
        ))}
      </div>

      <div>
        <Label>Situação</Label>
        <div className="grid grid-cols-2 rounded-xl border border-border bg-background p-1">
          {(["pending", "paid"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setStatus(option)}
              aria-pressed={status === option}
              className={cn(
                "min-h-11 rounded-xl text-sm font-medium transition-[color,background-color,box-shadow]",
                status === option
                  ? option === "paid"
                    ? "bg-income-soft text-income shadow-sm"
                    : "bg-warning-soft text-warning shadow-sm"
                  : "text-muted hover:bg-surface-2 hover:text-foreground",
              )}
            >
              {type === "income"
                ? option === "paid" ? "Recebida" : "A receber"
                : option === "paid" ? "Paga" : "Pendente"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="tx-desc">Descrição</Label>
        <Input
          id="tx-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Aluguel, Salário, Uber…"
          autoFocus
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="tx-cat">Categoria</Label>
          <div className="relative">
            <Select
              id="tx-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="cursor-pointer pr-10"
            >
              <option value="" disabled>Selecione uma categoria</option>
              {category && !metadata.categories.includes(category) && (
                <option value={category}>{category}</option>
              )}
              {metadata.categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
          </div>
        </div>
        <div>
          <Label htmlFor="tx-amount">Valor (R$)</Label>
          <Input
            id="tx-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            className="tnum"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="tx-due">{type === "income" ? "Data prevista" : "Vencimento"}</Label>
          <Input
            id="tx-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="tx-rec">Recorrência</Label>
          <Select
            id="tx-rec"
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as Recurrence | "")}
          >
            <option value="">Nenhuma</option>
            {metadata.recurrences.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        </div>
      </div>

      {type === "expense" && (
        <div>
          <Label htmlFor="tx-prio">Prioridade (opcional)</Label>
          <Select
            id="tx-prio"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority | "")}
          >
            <option value="">Sem prioridade</option>
            {metadata.priorities.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          className="flex-1"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          className="flex-1"
          disabled={!valid || submitting}
        >
          {submitting ? "Salvando…" : initial ? "Salvar" : "Adicionar"}
        </Button>
      </div>
    </form>
  )
}
