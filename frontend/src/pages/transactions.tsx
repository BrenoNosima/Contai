import { useMemo, useState, type ReactNode } from "react"
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Filter,
  Plus,
  X,
} from "lucide-react"
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
import { useFinanceMetadata } from "@/lib/metadata"
import { parseDate } from "@/lib/dates"
import { cn } from "@/lib/utils"

export default function TransactionsPage() {
  const metadata = useFinanceMetadata()
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

  function setTypeFilter(type?: TransactionType) {
    patch({ type })
  }

  const statusLabels =
    filters.type === "income"
      ? { all: "Todas", paid: "Recebidas", pending: "A receber" }
      : filters.type === "expense"
        ? { all: "Todas", paid: "Pagas", pending: "Pendentes" }
        : { all: "Todos", paid: "Concluídos", pending: "Em aberto" }

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
              {showFilters ? (
                <ChevronUp className="h-4 w-4" aria-hidden />
              ) : (
                <Filter className="h-4 w-4" aria-hidden />
              )}
              Filtros
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
        <Card elevated={false} className="mb-5 animate-in p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Filtrar lançamentos</p>
              <p className="mt-0.5 text-xs text-subtle">Refine a lista pelos dados que você precisa.</p>
            </div>
            <div className="flex items-center gap-1">
              {activeFilterCount > 0 && (
              <button
                onClick={() => setFilters({})}
                className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-muted transition-colors hover:bg-surface-3 hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" aria-hidden /> Limpar
              </button>
              )}
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                aria-label="Recolher filtros"
                title="Recolher filtros"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-3 hover:text-foreground"
              >
                <ChevronUp className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>

          <div>
            <Label>Tipo de lançamento</Label>
            <div className="grid grid-cols-3 rounded-xl border border-border bg-background p-1">
              <FilterOption active={!filters.type} onClick={() => setTypeFilter()}>
                Todos
              </FilterOption>
              <FilterOption active={filters.type === "income"} onClick={() => setTypeFilter("income")}>
                <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden /> Receitas
              </FilterOption>
              <FilterOption active={filters.type === "expense"} onClick={() => setTypeFilter("expense")}>
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> Despesas
              </FilterOption>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1.2fr_1.5fr]">
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
                <option value="">{statusLabels.all}</option>
                <option value="paid">{statusLabels.paid}</option>
                <option value="pending">{statusLabels.pending}</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="f-cat">Categoria</Label>
              <div className="relative">
                <Select
                  id="f-cat"
                  value={filters.category ?? ""}
                  onChange={(e) => patch({ category: e.target.value })}
                  className="cursor-pointer pr-10"
                >
                  <option value="">Todas as categorias</option>
                  {metadata.categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="f-start">De</Label>
                <Input
                  id="f-start"
                  type="date"
                  value={filters.start_date ?? ""}
                  max={filters.end_date}
                  onChange={(e) => patch({ start_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="f-end">Até</Label>
                <Input
                  id="f-end"
                  type="date"
                  value={filters.end_date ?? ""}
                  min={filters.start_date}
                  onChange={(e) => patch({ end_date: e.target.value })}
                />
              </div>
            </div>
          </div>
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

function FilterOption({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-all sm:text-sm",
        active
          ? "bg-surface-3 text-foreground shadow-sm"
          : "text-muted hover:bg-surface-2 hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}
