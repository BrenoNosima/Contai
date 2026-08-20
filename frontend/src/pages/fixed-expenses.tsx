import { useState, type FormEvent } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Plus, Repeat, Pencil, Trash2, CalendarClock } from "lucide-react"
import { fixedExpensesApi } from "@/lib/api"
import { qk, useFinanceInvalidation } from "@/lib/query"
import { errMsg } from "@/lib/hooks"
import { useToast } from "@/components/ui/toast"
import type { FixedExpense, FixedExpenseCreate } from "@/lib/types"
import { categoryMeta } from "@/lib/categories"
import { useFinanceMetadata } from "@/lib/metadata"
import { PageHeader } from "@/components/page-header"
import { Button, Card, Input, Label, Money } from "@/components/ui/primitives"
import { Dialog } from "@/components/ui/dialog"
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states"

export default function FixedExpensesPage() {
  const [form, setForm] = useState<{ open: boolean; item?: FixedExpense }>({
    open: false,
  })
  const [deleting, setDeleting] = useState<FixedExpense | null>(null)
  const { fixedExpenses: invalidateFixedExpenses } = useFinanceInvalidation()
  const toast = useToast()

  const query = useQuery({
    queryKey: qk.fixedExpenses,
    queryFn: fixedExpensesApi.list,
  })

  const create = useMutation({
    mutationFn: (data: FixedExpenseCreate) => fixedExpensesApi.create(data),
    onSuccess: () => {
      invalidateFixedExpenses()
      toast("Gasto fixo criado.")
      setForm({ open: false })
    },
    onError: (e) => toast(errMsg(e), "error"),
  })
  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<FixedExpenseCreate> }) =>
      fixedExpensesApi.update(id, data),
    onSuccess: () => {
      invalidateFixedExpenses()
      toast("Gasto fixo atualizado.")
      setForm({ open: false })
    },
    onError: (e) => toast(errMsg(e), "error"),
  })
  const remove = useMutation({
    mutationFn: (id: number) => fixedExpensesApi.remove(id),
    onSuccess: () => {
      invalidateFixedExpenses()
      toast("Gasto fixo removido.")
      setDeleting(null)
    },
    onError: (e) => toast(errMsg(e), "error"),
  })

  const total = (query.data ?? []).reduce((acc, e) => acc + e.amount, 0)

  return (
    <div className="animate-in">
      <PageHeader
        title="Gastos fixos"
        subtitle="Assinaturas, aluguel e cobranças mensais recorrentes."
        actions={
          <Button size="sm" variant="primary" onClick={() => setForm({ open: true })}>
            <Plus className="h-4 w-4" aria-hidden /> Novo gasto fixo
          </Button>
        }
      />

      {query.data && query.data.length > 0 && (
        <Card className="mb-4 flex items-center justify-between" elevated={false}>
          <div>
            <p className="text-xs text-muted">Total mensal em gastos fixos</p>
            <Money value={total} type="expense" className="mt-1 text-2xl" />
          </div>
          <span className="rounded-xl bg-expense-soft p-2.5 text-expense">
            <Repeat className="h-5 w-5" aria-hidden />
          </span>
        </Card>
      )}

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <Card elevated={false}>
          <EmptyState
            icon={<Repeat className="h-7 w-7" aria-hidden />}
            title="Nenhum gasto fixo"
            description="Cadastre cobranças recorrentes como aluguel, internet ou streaming."
            action={
              <Button size="sm" variant="primary" onClick={() => setForm({ open: true })}>
                <Plus className="h-4 w-4" aria-hidden /> Adicionar
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {query.data!
            .slice()
            .sort((a, b) => a.billing_day - b.billing_day)
            .map((item) => {
              const meta = categoryMeta(item.category)
              const Icon = meta.icon
              return (
                <div
                  key={item.id}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3 transition-colors hover:border-border-strong"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-muted">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                      <span>{meta.label}</span>
                      <span aria-hidden>·</span>
                      <span className="flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" aria-hidden />
                        dia {item.billing_day}
                      </span>
                    </p>
                  </div>
                  <Money value={item.amount} type="expense" />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setForm({ open: true, item })}
                      aria-label="Editar gasto fixo"
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted opacity-0 hover:bg-surface-3 hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                    </button>
                    <button
                      onClick={() => setDeleting(item)}
                      aria-label="Excluir gasto fixo"
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted opacity-0 hover:bg-expense-soft hover:text-expense focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
              )
            })}
        </div>
      )}

      <Dialog
        open={form.open}
        onClose={() => setForm({ open: false })}
        title={form.item ? "Editar gasto fixo" : "Novo gasto fixo"}
      >
        <FixedExpenseForm
          initial={form.item}
          submitting={create.isPending || update.isPending}
          onCancel={() => setForm({ open: false })}
          onSubmit={(data) =>
            form.item
              ? update.mutate({ id: form.item.id, data })
              : create.mutate(data)
          }
        />
      </Dialog>

      <Dialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Excluir gasto fixo?"
        description={deleting ? `"${deleting.name}" será removido.` : undefined}
      >
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setDeleting(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            disabled={remove.isPending}
            onClick={() => deleting && remove.mutate(deleting.id)}
          >
            {remove.isPending ? "Excluindo…" : "Excluir"}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}

function FixedExpenseForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial?: FixedExpense
  onSubmit: (data: FixedExpenseCreate) => void
  onCancel: () => void
  submitting?: boolean
}) {
  const metadata = useFinanceMetadata()
  const [name, setName] = useState(initial?.name ?? "")
  const [category, setCategory] = useState(initial?.category ?? "")
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "")
  const [billingDay, setBillingDay] = useState(
    initial ? String(initial.billing_day) : "",
  )

  const amountNum = Number(amount.replace(",", "."))
  const dayNum = Number(billingDay)
  const valid =
    name.trim() && category.trim() && amountNum > 0 && dayNum >= 1 && dayNum <= 31

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!valid) return
    onSubmit({
      name: name.trim(),
      category: category.trim(),
      amount: amountNum,
      billing_day: dayNum,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="fe-name">Nome</Label>
        <Input
          id="fe-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Netflix, Aluguel"
          autoFocus
        />
      </div>
      <div>
        <Label htmlFor="fe-cat">Categoria</Label>
        <Input
          id="fe-cat"
          list="fe-cat-list"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Categoria"
        />
        <datalist id="fe-cat-list">
          {metadata.categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="fe-amount">Valor (R$)</Label>
          <Input
            id="fe-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            className="tnum"
          />
        </div>
        <div>
          <Label htmlFor="fe-day">Dia da cobrança</Label>
          <Input
            id="fe-day"
            inputMode="numeric"
            value={billingDay}
            onChange={(e) => setBillingDay(e.target.value)}
            placeholder="1 a 31"
            className="tnum"
          />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="ghost" className="flex-1" onClick={onCancel}>
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
