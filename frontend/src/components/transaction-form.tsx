import { useState, type FormEvent } from "react"
import type {
  Transaction,
  TransactionCreate,
  TransactionType,
  Priority,
  Recurrence,
} from "@/lib/types"
import {
  Button,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui/primitives"
import { CATEGORY_SUGGESTIONS } from "@/lib/categories"
import { todayISO } from "@/lib/dates"
import { cn } from "@/lib/utils"

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
  const [type, setType] = useState<TransactionType>(initial?.type ?? "expense")
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
        <Label htmlFor="tx-desc">Descrição</Label>
        <Input
          id="tx-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Aluguel, Salário, Uber…"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="tx-cat">Categoria</Label>
          <Input
            id="tx-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Categoria"
            list="tx-cat-list"
          />
          <datalist id="tx-cat-list">
            {CATEGORY_SUGGESTIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="tx-due">Vencimento</Label>
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
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensal</option>
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
            <option value="essential">Essencial</option>
            <option value="desirable">Desejável</option>
            <option value="superfluous">Supérfluo</option>
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

// Kept for callers that only need a quick natural-language entry.
export function QuickTextForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (text: string) => void
  submitting?: boolean
}) {
  const [text, setText] = useState("")
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (text.trim()) onSubmit(text.trim())
      }}
      className="space-y-3"
    >
      <Textarea
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='Escreva naturalmente: "gastei 45 no Uber ontem"'
      />
      <Button
        type="submit"
        variant="primary"
        className="w-full"
        disabled={!text.trim() || submitting}
      >
        {submitting ? "Interpretando…" : "Adicionar com IA"}
      </Button>
    </form>
  )
}
