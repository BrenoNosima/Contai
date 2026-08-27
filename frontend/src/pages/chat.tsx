import { useEffect, useRef, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Bot, Send } from "lucide-react"
import { assistantActionsApi, chatApi } from "@/lib/api"
import type { AssistantAction } from "@/lib/types"
import { useFinanceInvalidation } from "@/lib/query"
import { PageHeader } from "@/components/page-header"
import { cn } from "@/lib/utils"

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
            <MessageBubble key={m.id} message={m} onChanged={invalidateFinance} />
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

function MessageBubble({ message, onChanged }: { message: Message; onChanged: () => void }) {
  const isUser = message.role === "user"
  const [actions, setActions] = useState(message.actions ?? [])
  const actionMutation = useMutation({
    mutationFn: ({ id, confirm }: { id: string; confirm: boolean }) =>
      confirm ? assistantActionsApi.confirm(id) : assistantActionsApi.reject(id),
    onSuccess: (updated) => {
      setActions((items) => items.filter((item) => item.id !== updated.id))
      onChanged()
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
          <div key={action.id} className="mt-3 rounded-xl border border-border bg-surface-2 p-3">
            <p className="text-xs text-muted">Confirme antes de executar: {action.action}</p>
            <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs">{JSON.stringify(action.payload, null, 2)}</pre>
            <div className="mt-2 flex gap-2">
              <button disabled={actionMutation.isPending} onClick={() => actionMutation.mutate({ id: action.id, confirm: true })} className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground">Confirmar</button>
              <button disabled={actionMutation.isPending} onClick={() => actionMutation.mutate({ id: action.id, confirm: false })} className="rounded-lg border border-border px-3 py-1.5 text-xs">Cancelar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
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
