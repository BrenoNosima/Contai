import { useEffect, useRef, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { ArrowUp, Check, LoaderCircle, ReceiptText, X } from "lucide-react"
import { assistantActionsApi, chatApi } from "@/lib/api"
import type { AssistantAction } from "@/lib/types"
import { useFinanceInvalidation } from "@/lib/query"
import { AnimatedLogo } from "@/components/animated-logo"
import { useAuth } from "@/lib/auth"
import { cn, formatMoney } from "@/lib/utils"
import { Link } from "react-router-dom"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  error?: boolean
  actions?: AssistantAction[]
}

const SUGGESTIONS = [
  "Quanto gastei este mês?",
  "Quais são minhas maiores despesas?",
  "Como estão minhas metas?",
  "Onde posso economizar?",
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const { user } = useAuth()
  const { allFinance: invalidateFinance } = useFinanceInvalidation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const shouldAutoScrollRef = useRef(true)

  const mutation = useMutation({
    mutationFn: ({ message, history }: { message: string; history: Message[] }) =>
      chatApi.send(
        message,
        history
          .filter((item) => !item.error)
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
    if (!shouldAutoScrollRef.current) return
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, mutation.isPending])

  function submit(text: string) {
    const trimmed = text.trim()
    if (!trimmed || mutation.isPending) return
    shouldAutoScrollRef.current = true
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

  function trackScroll() {
    const container = scrollRef.current
    if (!container) return
    shouldAutoScrollRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < 120
  }

  const hasMessages = messages.length > 0

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={trackScroll}
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 sm:px-4"
      >
        <div className={cn("relative z-10 mx-auto flex min-h-full max-w-3xl flex-col", hasMessages ? "gap-6 py-5 sm:py-8" : "justify-center py-8")}>
          {!hasMessages ? (
            <ChatWelcome firstName={user?.name.trim().split(/\s+/)[0]} onSuggestion={submit} />
          ) : (
            <>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onActionResolved={(action) => {
                    setMessages((current) => [...current, {
                      id: crypto.randomUUID(),
                      role: "assistant",
                      content: action.status === "confirmed" ? confirmedActionMessage(action) : cancelledActionMessage(action),
                    }])
                    if (action.status === "confirmed") invalidateFinance()
                  }}
                />
              ))}
              {mutation.isPending && <TypingIndicator />}
            </>
          )}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(input)
        }}
        className="mx-auto mt-2 flex w-full max-w-3xl items-end gap-2 rounded-[1.35rem] border border-border bg-surface-2 p-2 shadow-[0_18px_45px_-28px_rgba(0,0,0,0.9)] transition-colors focus-within:border-income/60"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={10_000}
          placeholder="Pergunte ao Contaí..."
          className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-base leading-6 text-foreground outline-none placeholder:text-subtle"
          aria-label="Mensagem para o assistente"
        />
        <button
          type="submit"
          disabled={!input.trim() || mutation.isPending}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-income text-background shadow-[0_8px_22px_-10px_var(--color-income)] transition-[background-color,opacity] hover:bg-income/90 disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Enviar mensagem"
        >
          <ArrowUp className="h-5 w-5" aria-hidden />
        </button>
      </form>
      <p className="mx-auto mt-2 max-w-3xl px-3 text-center text-[11px] leading-4 text-subtle">
        As mensagens e os dados financeiros necessários à resposta são processados pela Groq nos Estados Unidos. Não envie senhas ou documentos. <Link to="/privacidade" className="underline underline-offset-2 hover:text-foreground">Saiba como seus dados são tratados</Link>.
      </p>
    </div>
  )
}

function ChatWelcome({ firstName, onSuggestion }: { firstName?: string; onSuggestion: (text: string) => void }) {
  return (
    <section className="animate-in mx-auto flex w-full max-w-2xl flex-col items-center px-2 text-center" aria-labelledby="chat-welcome-title">
      <AnimatedLogo className="mb-8" imageClassName="w-32 sm:w-36" />
      <p className="text-sm font-medium text-income">Olá{firstName ? `, ${firstName}` : ""}</p>
      <h1 id="chat-welcome-title" className="mt-3 max-w-lg text-balance text-3xl font-semibold tracking-[-0.045em] text-foreground sm:text-4xl">
        Como posso te ajudar com suas finanças hoje?
      </h1>
      <div className="mt-8 grid w-full grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Sugestões de perguntas">
        {SUGGESTIONS.map((suggestion) => (
          <button key={suggestion} type="button" onClick={() => onSuggestion(suggestion)} className="min-h-12 rounded-2xl border border-border bg-surface/45 px-4 py-3 text-left text-sm leading-5 text-muted transition-colors hover:border-border-strong hover:bg-surface-2 hover:text-foreground active:bg-surface-3">
            {suggestion}
          </button>
        ))}
      </div>
    </section>
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
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-2" aria-hidden>
          <AnimatedLogo imageClassName="w-7" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[88%] whitespace-pre-wrap text-sm leading-6 sm:max-w-[78%]",
          isUser
            ? "rounded-2xl rounded-br-md border border-income/15 bg-income-soft px-4 py-2.5 text-foreground"
            : message.error
              ? "rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-foreground"
              : "rounded-2xl rounded-bl-md bg-surface-2 px-4 py-3 text-foreground",
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

function TypingIndicator() {
  return (
    <div className="flex items-center gap-3" role="status" aria-live="polite">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-2" aria-hidden>
        <AnimatedLogo imageClassName="w-7" />
      </div>
      <div className="rounded-2xl rounded-bl-md bg-surface-2 px-4 py-3 text-sm text-muted">
        <span className="sr-only">Contaí está pensando</span>
        <span className="flex items-center gap-1.5" aria-hidden>
          <span className="typing-dot" />
          <span className="typing-dot [animation-delay:160ms]" />
          <span className="typing-dot [animation-delay:320ms]" />
        </span>
      </div>
    </div>
  )
}
