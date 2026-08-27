import { useEffect, useRef, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Bot, Check, LoaderCircle, ReceiptText, Send, X } from "lucide-react"
import { assistantActionsApi, chatApi } from "@/lib/api"
import type { AssistantAction } from "@/lib/types"
import { useFinanceInvalidation } from "@/lib/query"
import { PageHeader } from "@/components/page-header"
import { cn, formatMoney } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  error?: boolean
  actions?: AssistantAction[]
}

const SUGGESTIONS = [
  "Gastei 45 reais no mercado hoje",
  "Quanto gastei esse mês?",
  "Recebi meu salário de 3200",
  "Quais são minhas maiores despesas?",
]

const GREETING: Message = {
  id: "greeting",
  role: "assistant",
  content:
    "Olá! Posso registrar movimentações, consultar seus números e ajudar a organizar sua rotina financeira. O que você precisa?",
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [input, setInput] = useState("")
  const { allFinance: invalidateFinance } = useFinanceInvalidation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const mutation = useMutation({
    mutationFn: ({ message, history }: { message: string; history: Message[] }) =>
      chatApi.send(
        message,
        history
          .filter((item) => item.id !== "greeting" && !item.error)
          .map(({ role, content }) => ({ role, content })),
      ),
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: data.response, actions: data.pending_actions },
      ])
      // The assistant may have changed any financial domain through its tools.
      invalidateFinance()
    },
    onError: (err: Error) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: err.message || "Algo deu errado ao falar com o assistente. Tente de novo.",
          error: true,
        },
      ])
    },
  })

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, mutation.isPending])

  function submit(text: string) {
    const trimmed = text.trim()
    if (!trimmed || mutation.isPending) return
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: trimmed }])
    setInput("")
    mutation.mutate({ message: trimmed, history: messages })
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const composing = e.nativeEvent.isComposing || e.keyCode === 229
    if (e.key === "Enter" && !e.shiftKey && !composing) {
      e.preventDefault()
      submit(input)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PageHeader
        title="Assistente Contaí"
        subtitle="Registre e consulte suas finanças em linguagem natural."
      />

      <div
        ref={scrollRef}
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-2xl border border-border bg-surface px-3 py-4 sm:px-6 sm:py-6"
      >
        <div className="relative z-10 mx-auto flex max-w-2xl flex-col gap-6">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              onActionResolved={(action) => {
                setMessages((current) => [
                  ...current,
                  {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: action.status === "confirmed" ? confirmedActionMessage(action) : cancelledActionMessage(action),
                  },
                ])
                if (action.status === "confirmed") invalidateFinance()
              }}
            />
          ))}
          {mutation.isPending && <TypingBubble />}
          {messages.length <= 1 && (
            <div className="ml-10 grid gap-2 pt-1 sm:ml-11 sm:grid-cols-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => submit(suggestion)}
                  className="min-h-11 rounded-xl border border-border bg-background/35 px-3 py-2.5 text-left text-xs leading-relaxed text-muted transition-colors hover:border-border-strong hover:bg-surface-2 hover:text-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(input)
        }}
        className="mt-2 flex items-end gap-2 rounded-2xl border border-border bg-surface p-2 transition-colors focus-within:border-border-strong"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={10_000}
          placeholder="Digite uma mensagem..."
          className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-base leading-6 text-foreground outline-none placeholder:text-subtle sm:text-sm"
          aria-label="Mensagem para o assistente"
        />
        <button
          type="submit"
          disabled={!input.trim() || mutation.isPending}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-[color:#f1f3f2] disabled:opacity-40"
          aria-label="Enviar mensagem"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}

function MessageBubble({
  message,
  onActionResolved,
}: {
  message: Message
  onActionResolved: (action: AssistantAction) => void
}) {
  const isUser = message.role === "user"
  const [actions, setActions] = useState(message.actions ?? [])
  const actionMutation = useMutation({
    mutationFn: ({ id, confirm }: { id: string; confirm: boolean }) =>
      confirm ? assistantActionsApi.confirm(id) : assistantActionsApi.reject(id),
    onSuccess: (updated) => {
      setActions((items) => items.filter((item) => item.id !== updated.id))
      onActionResolved(updated)
    },
  })
  return (
    <div className={cn("flex items-start gap-3", isUser && "justify-end")}>
      {!isUser && (
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
          aria-hidden
        >
          <span className="text-xs font-bold">C</span>
        </div>
      )}
      <div
        className={cn(
          "max-w-[88%] whitespace-pre-wrap text-sm leading-6 sm:max-w-[78%]",
          isUser
            ? "rounded-2xl rounded-br-md bg-surface-3 px-4 py-2.5 text-foreground"
            : message.error
              ? "rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-foreground"
              : "py-1 text-foreground",
        )}
      >
        <FormattedMessage content={message.content} />
        {actions.map((action) => (
          <ActionConfirmationCard
            key={action.id}
            action={action}
            isPending={actionMutation.isPending}
            error={actionMutation.error instanceof Error ? actionMutation.error.message : null}
            onConfirm={() => actionMutation.mutate({ id: action.id, confirm: true })}
            onReject={() => actionMutation.mutate({ id: action.id, confirm: false })}
          />
        ))}
      </div>
    </div>
  )
}

function confirmedActionMessage(action: AssistantAction): string {
  const payload = action.payload

  switch (action.action) {
    case "create_transaction": {
      const kind = payload.type === "income" ? "receita" : "despesa"
      const amount = formatMoney(Number(payload.amount))
      const description = payload.description ? ` — ${payload.description}` : ""
      const category = payload.category ? ` na categoria ${payload.category}` : ""
      return `Lançamento concluído: ${kind} de ${amount}${category}${description}. Seus dados financeiros já foram atualizados.`
    }
    case "mark_transaction_status":
      return `Atualização concluída: o lançamento #${payload.transaction_id} foi marcado como ${formatActionValue("status", payload.status).toLowerCase()}.`
    case "generate_recurring_occurrences":
      return `Geração concluída: os lançamentos recorrentes dos próximos ${formatActionValue("months_ahead", payload.months_ahead)} foram atualizados.`
    case "create_goal":
      return `Criação concluída: a meta “${payload.name}” foi criada com o valor de ${formatMoney(Number(payload.target_amount))}.`
    case "add_goal_progress":
      return `Progresso concluído: ${formatMoney(Number(payload.amount))} foram adicionados à meta #${payload.goal_id}.`
    case "create_fixed_expense":
      return `Cadastro concluído: a despesa fixa “${payload.name}”, no valor de ${formatMoney(Number(payload.amount))}, foi adicionada.`
    default:
      return "Ação concluída com sucesso. Seus dados financeiros já foram atualizados."
  }
}

function cancelledActionMessage(action: AssistantAction): string {
  const descriptions: Record<string, string> = {
    create_transaction: "o novo lançamento",
    mark_transaction_status: "a alteração de status",
    generate_recurring_occurrences: "a geração dos lançamentos recorrentes",
    create_goal: "a criação da meta",
    add_goal_progress: "a atualização da meta",
    create_fixed_expense: "a criação da despesa fixa",
  }
  return `Tudo bem, ${descriptions[action.action] ?? "a ação financeira"} foi cancelada e nenhuma alteração foi feita.`
}

const ACTION_TITLES: Record<string, string> = {
  create_transaction: "Novo lançamento",
  mark_transaction_status: "Alterar status do lançamento",
  generate_recurring_occurrences: "Gerar lançamentos recorrentes",
  create_goal: "Nova meta financeira",
  add_goal_progress: "Adicionar progresso à meta",
  create_fixed_expense: "Nova despesa fixa",
}

const FIELD_LABELS: Record<string, string> = {
  type: "Tipo",
  description: "Descrição",
  category: "Categoria",
  amount: "Valor",
  priority: "Prioridade",
  due_date: "Data",
  is_recurring: "Recorrente",
  recurrence: "Frequência",
  transaction_id: "Lançamento",
  status: "Status",
  months_ahead: "Período",
  name: "Nome",
  target_amount: "Valor da meta",
  current_amount: "Valor inicial",
  deadline: "Prazo",
  goal_id: "Meta",
  billing_day: "Dia de cobrança",
}

const VALUE_LABELS: Record<string, string> = {
  expense: "Despesa",
  income: "Receita",
  essential: "Essencial",
  desirable: "Desejável",
  superfluous: "Supérflua",
  paid: "Pago",
  pending: "Pendente",
  weekly: "Semanal",
  monthly: "Mensal",
}

function formatActionValue(field: string, value: unknown): string {
  if (field === "amount" || field === "target_amount" || field === "current_amount") {
    return formatMoney(Number(value))
  }
  if (field === "months_ahead") return `${value} ${Number(value) === 1 ? "mês" : "meses"}`
  if (field === "transaction_id" || field === "goal_id") return `#${value}`
  if (field === "billing_day") return `Dia ${value}`
  if ((field === "due_date" || field === "deadline") && /^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    const [year, month, day] = String(value).split("-")
    return `${day}/${month}/${year}`
  }
  if (typeof value === "boolean") return value ? "Sim" : "Não"
  return VALUE_LABELS[String(value)] ?? String(value)
}

function ActionConfirmationCard({
  action,
  isPending,
  error,
  onConfirm,
  onReject,
}: {
  action: AssistantAction
  isPending: boolean
  error: string | null
  onConfirm: () => void
  onReject: () => void
}) {
  const fields = Object.entries(action.payload).filter(([, value]) => value !== null && value !== undefined && value !== false)
  const type = action.payload.type === "income" ? "Receita" : action.payload.type === "expense" ? "Despesa" : null

  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-border bg-surface-2" aria-label="Confirmação de ação">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-foreground" aria-hidden>
          <ReceiptText className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">Revise antes de confirmar</p>
          <h3 className="font-semibold leading-5">{type ? `Nova ${type.toLowerCase()}` : ACTION_TITLES[action.action] ?? "Ação financeira"}</h3>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-x-5 gap-y-3 px-4 py-4 sm:grid-cols-2">
        {fields.map(([field, value]) => (
          <div key={field} className={cn(field === "description" && "sm:col-span-2")}>
            <dt className="text-xs text-muted">{FIELD_LABELS[field] ?? field}</dt>
            <dd className={cn("mt-0.5 break-words font-medium leading-5", field.includes("amount") && "tabular-nums")}>
              {formatActionValue(field, value)}
            </dd>
          </div>
        ))}
      </dl>

      {error && <p className="px-4 pb-3 text-xs text-danger" role="alert">{error}</p>}

      <div className="flex flex-col-reverse gap-2 border-t border-border px-4 py-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={isPending}
          onClick={onReject}
          className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X className="h-4 w-4" aria-hidden /> Cancelar
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={onConfirm}
          className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
          {isPending ? "Processando..." : "Confirmar"}
        </button>
      </div>
    </section>
  )
}

function FormattedMessage({ content }: { content: string }) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g)

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={index}>{part.slice(2, -2)}</strong>
        }

        return <span key={index}>{part}</span>
      })}
    </>
  )
}

function TypingBubble() {
  return (
    <div className="flex items-center gap-3" role="status" aria-live="polite">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
        aria-hidden
      >
        <span className="text-xs font-bold">C</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted">
        <Bot className="h-4 w-4" aria-hidden />
        <span>Organizando sua resposta</span>
        <span className="flex items-center gap-1" aria-hidden>
          <span className="h-1 w-1 animate-pulse rounded-full bg-muted" />
          <span className="h-1 w-1 animate-pulse rounded-full bg-muted [animation-delay:150ms]" />
          <span className="h-1 w-1 animate-pulse rounded-full bg-muted [animation-delay:300ms]" />
        </span>
      </div>
    </div>
  )
}
