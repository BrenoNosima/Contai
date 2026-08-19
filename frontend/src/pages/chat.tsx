import { useEffect, useRef, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Bot, Send, Sparkles, User } from "lucide-react"
import { chatApi } from "@/lib/api"
import { PageHeader } from "@/components/page-header"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  error?: boolean
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
    "Oi! Eu sou o assistente do Breno Finance. Posso registrar gastos e entradas em linguagem natural, responder sobre seus números e te ajudar a organizar as contas. Como posso ajudar?",
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [input, setInput] = useState("")
  const queryClient = useQueryClient()
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
        { id: crypto.randomUUID(), role: "assistant", content: data.response },
      ])
      // The assistant may have created/edited transactions — refresh everything.
      queryClient.invalidateQueries()
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
    <div className="flex h-[calc(100dvh-8rem)] flex-col md:h-[calc(100dvh-6rem)]">
      <PageHeader
        title="Assistente"
        subtitle="Converse em português para registrar e consultar suas finanças."
      />

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-2xl border border-border bg-surface p-4"
      >
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {mutation.isPending && <TypingBubble />}
        </div>
      </div>

      {messages.length <= 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => submit(s)}
              className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-muted transition-colors hover:border-primary hover:text-foreground"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(input)
        }}
        className="mt-3 flex items-end gap-2 rounded-2xl border border-border bg-surface p-2"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Escreva uma mensagem... (ex: gastei 30 no uber)"
          className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-foreground outline-none placeholder:text-muted"
          aria-label="Mensagem para o assistente"
        />
        <button
          type="submit"
          disabled={!input.trim() || mutation.isPending}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          aria-label="Enviar mensagem"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user"
  return (
    <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-surface-2 text-muted" : "bg-primary/15 text-primary",
        )}
        aria-hidden
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-tr-sm bg-primary text-primary-foreground"
            : message.error
              ? "rounded-tl-sm border border-danger/40 bg-danger/10 text-foreground"
              : "rounded-tl-sm bg-surface-2 text-foreground",
        )}
      >
        <FormattedMessage content={message.content} />
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
    <div className="flex items-start gap-3">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
        aria-hidden
      >
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-surface-2 px-4 py-3">
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted" />
      </div>
    </div>
  )
}
