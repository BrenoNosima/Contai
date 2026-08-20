import { useState, type FormEvent } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Plus, Target, Pencil, Trash2, TrendingUp, Flag } from "lucide-react"
import { format } from "date-fns"
import { goalsApi } from "@/lib/api"
import { qk, useFinanceInvalidation } from "@/lib/query"
import { errMsg } from "@/lib/hooks"
import { useToast } from "@/components/ui/toast"
import type { Goal, GoalCreate, GoalStatus } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { Button, Card, Input, Label, Money, Textarea } from "@/components/ui/primitives"
import { Dialog } from "@/components/ui/dialog"
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states"
import { parseDate } from "@/lib/dates"
import { cn } from "@/lib/utils"

const STATUS_META: Record<
  GoalStatus,
  { label: string; className: string; bar: string }
> = {
  active: { label: "Em andamento", className: "text-primary bg-primary/15", bar: "bg-primary" },
  completed: { label: "Concluída", className: "text-income bg-income-soft", bar: "bg-income" },
  overdue: { label: "Atrasada", className: "text-expense bg-expense-soft", bar: "bg-expense" },
}

export default function GoalsPage() {
  const [form, setForm] = useState<{ open: boolean; goal?: Goal }>({ open: false })
  const [progressFor, setProgressFor] = useState<Goal | null>(null)
  const [deleting, setDeleting] = useState<Goal | null>(null)
  const { goals: invalidateGoals } = useFinanceInvalidation()
  const toast = useToast()

  const query = useQuery({ queryKey: qk.goals, queryFn: goalsApi.list })

  const create = useMutation({
    mutationFn: (data: GoalCreate) => goalsApi.create(data),
    onSuccess: () => {
      invalidateGoals()
      toast("Meta criada.")
      setForm({ open: false })
    },
    onError: (e) => toast(errMsg(e), "error"),
  })
  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<GoalCreate> }) =>
      goalsApi.update(id, data),
    onSuccess: () => {
      invalidateGoals()
      toast("Meta atualizada.")
      setForm({ open: false })
    },
    onError: (e) => toast(errMsg(e), "error"),
  })
  const remove = useMutation({
    mutationFn: (id: number) => goalsApi.remove(id),
    onSuccess: () => {
      invalidateGoals()
      toast("Meta removida.")
      setDeleting(null)
    },
    onError: (e) => toast(errMsg(e), "error"),
  })
  const addProgress = useMutation({
    mutationFn: ({ id, amount }: { id: number; amount: number }) =>
      goalsApi.addProgress(id, amount),
    onSuccess: () => {
      invalidateGoals()
      toast("Progresso adicionado.")
      setProgressFor(null)
    },
    onError: (e) => toast(errMsg(e), "error"),
  })

  return (
    <div className="animate-in">
      <PageHeader
        title="Metas"
        subtitle="Acompanhe seus objetivos financeiros."
        actions={
          <Button size="sm" variant="primary" onClick={() => setForm({ open: true })}>
            <Plus className="h-4 w-4" aria-hidden /> Nova meta
          </Button>
        }
      />

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <Card elevated={false}>
          <EmptyState
            icon={<Target className="h-7 w-7" aria-hidden />}
            title="Nenhuma meta ainda"
            description="Defina um objetivo, como uma reserva de emergência ou uma viagem."
            action={
              <Button size="sm" variant="primary" onClick={() => setForm({ open: true })}>
                <Plus className="h-4 w-4" aria-hidden /> Criar meta
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {query.data!.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={() => setForm({ open: true, goal })}
              onDelete={() => setDeleting(goal)}
              onAddProgress={() => setProgressFor(goal)}
            />
          ))}
        </div>
      )}

      {/* Create / edit */}
      <Dialog
        open={form.open}
        onClose={() => setForm({ open: false })}
        title={form.goal ? "Editar meta" : "Nova meta"}
      >
        <GoalForm
          initial={form.goal}
          submitting={create.isPending || update.isPending}
          onCancel={() => setForm({ open: false })}
          onSubmit={(data) =>
            form.goal
              ? update.mutate({ id: form.goal.id, data })
              : create.mutate(data)
          }
        />
      </Dialog>

      {/* Add progress */}
      <Dialog
        open={!!progressFor}
        onClose={() => setProgressFor(null)}
        title="Adicionar progresso"
        description={progressFor?.name}
      >
        {progressFor && (
          <ProgressForm
            goal={progressFor}
            submitting={addProgress.isPending}
            onCancel={() => setProgressFor(null)}
            onSubmit={(amount) =>
              addProgress.mutate({ id: progressFor.id, amount })
            }
          />
        )}
      </Dialog>

      {/* Delete */}
      <Dialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Excluir meta?"
        description={deleting ? `"${deleting.name}" será removida.` : undefined}
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

function GoalCard({
  goal,
  onEdit,
  onDelete,
  onAddProgress,
}: {
  goal: Goal
  onEdit: () => void
  onDelete: () => void
  onAddProgress: () => void
}) {
  const meta = STATUS_META[goal.status]
  const pct = Math.min(100, Math.max(0, goal.progress_percentage))
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{goal.name}</p>
          {goal.description && (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted">
              {goal.description}
            </p>
          )}
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
            meta.className,
          )}
        >
          {meta.label}
        </span>
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <Money value={goal.current_amount} className="text-lg text-foreground" />
          <span className="tnum text-xs text-muted">
            de <Money value={goal.target_amount} className="text-xs text-muted" />
          </span>
        </div>
        <div
          className="h-2.5 w-full overflow-hidden rounded-full bg-surface-3"
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={cn("h-full rounded-full transition-all", meta.bar)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs">
          <span className="tnum font-medium text-foreground">
            {Math.round(goal.progress_percentage)}%
          </span>
          {goal.remaining_amount > 0 && (
            <span className="text-muted">
              faltam <Money value={goal.remaining_amount} className="text-xs text-muted" />
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-subtle">
          {goal.deadline ? (
            <>
              <Flag className="h-3.5 w-3.5" aria-hidden />
              {format(parseDate(goal.deadline), "dd/MM/yyyy")}
            </>
          ) : (
            "Sem prazo"
          )}
        </span>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="secondary" onClick={onAddProgress}>
            <TrendingUp className="h-4 w-4" aria-hidden /> Progresso
          </Button>
          <button
            onClick={onEdit}
            aria-label="Editar meta"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </button>
          <button
            onClick={onDelete}
            aria-label="Excluir meta"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-expense-soft hover:text-expense"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </Card>
  )
}

function GoalForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial?: Goal
  onSubmit: (data: GoalCreate) => void
  onCancel: () => void
  submitting?: boolean
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [target, setTarget] = useState(initial ? String(initial.target_amount) : "")
  const [current, setCurrent] = useState(
    initial ? String(initial.current_amount) : "",
  )
  const [description, setDescription] = useState(initial?.description ?? "")
  const [deadline, setDeadline] = useState(
    initial?.deadline ? initial.deadline.slice(0, 10) : "",
  )

  const targetNum = Number(target.replace(",", "."))
  const currentNum = Number(current.replace(",", ".")) || 0
  const valid = name.trim() && targetNum > 0

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!valid) return
    onSubmit({
      name: name.trim(),
      target_amount: targetNum,
      current_amount: currentNum,
      description: description.trim() || null,
      deadline: deadline || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="g-name">Nome</Label>
        <Input
          id="g-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Reserva de emergência"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="g-target">Valor alvo (R$)</Label>
          <Input
            id="g-target"
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="0,00"
            className="tnum"
          />
        </div>
        <div>
          <Label htmlFor="g-current">Valor atual (R$)</Label>
          <Input
            id="g-current"
            inputMode="decimal"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="0,00"
            className="tnum"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="g-deadline">Prazo (opcional)</Label>
        <Input
          id="g-deadline"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="g-desc">Descrição (opcional)</Label>
        <Textarea
          id="g-desc"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Um lembrete do porquê dessa meta"
        />
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
          {submitting ? "Salvando…" : initial ? "Salvar" : "Criar meta"}
        </Button>
      </div>
    </form>
  )
}

function ProgressForm({
  goal,
  onSubmit,
  onCancel,
  submitting,
}: {
  goal: Goal
  onSubmit: (amount: number) => void
  onCancel: () => void
  submitting?: boolean
}) {
  const [amount, setAmount] = useState("")
  const num = Number(amount.replace(",", "."))
  const valid = num > 0

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onSubmit(num)
      }}
      className="space-y-4"
    >
      <div className="rounded-xl bg-surface-2 px-4 py-3 text-sm">
        <div className="flex items-center justify-between text-muted">
          <span>Atual</span>
          <Money value={goal.current_amount} className="text-foreground" />
        </div>
        <div className="mt-1 flex items-center justify-between text-muted">
          <span>Meta</span>
          <Money value={goal.target_amount} className="text-foreground" />
        </div>
      </div>
      <div>
        <Label htmlFor="p-amount">Adicionar valor (R$)</Label>
        <Input
          id="p-amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0,00"
          className="tnum"
          autoFocus
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          className="flex-1"
          disabled={!valid || submitting}
        >
          {submitting ? "Adicionando…" : "Adicionar"}
        </Button>
      </div>
    </form>
  )
}
