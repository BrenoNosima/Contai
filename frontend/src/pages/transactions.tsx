import { useMemo, useState } from "react"
import { Plus, Filter, X } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useTransactions, useTransactionMutations } from "@/lib/hooks"
import type {
  Transaction,
  TransactionFilters,
  TransactionStatus,
  TransactionType,
} from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { Button, Card, Input, Label, Select } from "@/components/ui/primitives"
import { Dialog } from "@/components/ui/dialog"
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states"
import { TransactionCard } from "@/components/transaction-card"
import { TransactionForm } from "@/components/transaction-form"
import { CATEGORY_SUGGESTIONS } from "@/lib/categories"
import { parseDate } from "@/lib/dates"
import { cn } from "@/lib/utils"

export default function TransactionsPage() {
  const [filters, setFilters] = useState<TransactionFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [deleting, setDeleting] = useState<Transaction | null>(null)

  const query = useTransactions(filters)
  const { create, update, remove, toggleStatus, setStatus } =
    useTransactionMutations()

  const grouped = useMemo(() => {
    const list = [...(query.data ?? [])].sort(
      (a, b) => parseDate(b.due_date).getTime() - parseDate(a.due_date).getTime(),
    )
    const groups = new Map<string, Transaction[]>()
    for (const t of list) {
      const key = format(parseDate(t.due_date), "yyyy-MM-dd")
      const arr = groups.get(key) ?? []
      arr.push(t)
      groups.set(key, arr)
    }
    return [...groups.entries()]
  }, [query.data])

  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== undefined && v !== "",
  ).length

  function patch(next: Partial<TransactionFilters>) {
    setFilters((f) => {
      const merged = { ...f, ...next }
      for (const k of Object.keys(merged) as (keyof TransactionFilters)[]) {
        if (merged[k] === "" || merged[k] === undefined) delete merged[k]
      }
      return merged
    })
  }

  return (
    <div className="animate-in">
      <PageHeader
        title="Lançamentos"
        subtitle="Suas receitas e despesas, agrupadas por data."
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowFilters((s) => !s)}
              aria-expanded={showFilters}
            >
              <Filter className="h-4 w-4" aria-hidden /> Filtros
              {activeFilterCount > 0 && (
                <span className="ml-1 rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            <Button size="sm" variant="primary" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" aria-hidden /> Adicionar
            </Button>
          </>
        }
      />

      {showFilters && (
        <Card elevated={false} className="mb-4 animate-in">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="f-type">Tipo</Label>
              <Select
                id="f-type"
                value={filters.type ?? ""}
                onChange={(e) =>
                  patch({ type: (e.target.value || undefined) as TransactionType })
                }
              >
                <option value="">Todos</option>
                <option value="income">Receita</option>
                <option value="expense">Despesa</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="f-status">Status</Label>
              <Select
                id="f-status"
                value={filters.status ?? ""}
                onChange={(e) =>
                  patch({
                    status: (e.target.value || undefined) as TransactionStatus,
                  })
                }
              >
                <option value="">Todos</option>
                <option value="paid">Pago</option>
                <option value="pending">Pendente</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="f-cat">Categoria</Label>
              <Input
                id="f-cat"
                list="f-cat-list"
                value={filters.category ?? ""}
                onChange={(e) => patch({ category: e.target.value })}
                placeholder="Todas"
              />
              <datalist id="f-cat-list">
                {CATEGORY_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="f-start">De</Label>
                <Input
                  id="f-start"
                  type="date"
                  value={filters.start_date ?? ""}
                  onChange={(e) => patch({ start_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="f-end">Até</Label>
                <Input
                  id="f-end"
                  type="date"
                  value={filters.end_date ?? ""}
                  onChange={(e) => patch({ end_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={() => setFilters({})}
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" aria-hidden /> Limpar filtros
            </button>
          )}
        </Card>
      )}

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState
          message="Não foi possível carregar os lançamentos."
          onRetry={() => query.refetch()}
        />
      ) : grouped.length === 0 ? (
        <Card elevated={false}>
          <EmptyState
            title="Nenhum lançamento"
            description={
              activeFilterCount > 0
                ? "Nenhum resultado para esses filtros."
                : "Adicione sua primeira receita ou despesa."
            }
            action={
              <Button variant="primary" size="sm" onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4" aria-hidden /> Adicionar
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {grouped.map(([day, items]) => (
            <div key={day}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle">
                {format(parseDate(day), "EEEE, dd 'de' MMM", { locale: ptBR })}
              </p>
              <div className="space-y-2">
                {items.map((tx) => (
                  <TransactionCard
                    key={tx.id}
                    tx={tx}
                    busy={setStatus.isPending}
                    onToggleStatus={toggleStatus}
                    onEdit={setEditing}
                    onDelete={setDeleting}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add */}
      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Novo lançamento"
      >
        <TransactionForm
          submitting={create.isPending}
          onCancel={() => setAdding(false)}
          onSubmit={(data) =>
            create.mutate(data, { onSuccess: () => setAdding(false) })
          }
        />
      </Dialog>

      {/* Edit */}
      <Dialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Editar lançamento"
      >
        {editing && (
          <TransactionForm
            initial={editing}
            submitting={update.isPending}
            onCancel={() => setEditing(null)}
            onSubmit={(data) =>
              update.mutate(
                { id: editing.id, data },
                { onSuccess: () => setEditing(null) },
              )
            }
          />
        )}
      </Dialog>

      {/* Delete confirm */}
      <Dialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Excluir lançamento?"
        description={
          deleting
            ? `"${deleting.description}" será removido permanentemente.`
            : undefined
        }
      >
        <div className="flex gap-2">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => setDeleting(null)}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            disabled={remove.isPending}
            onClick={() =>
              deleting &&
              remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
            }
          >
            {remove.isPending ? "Excluindo…" : "Excluir"}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
