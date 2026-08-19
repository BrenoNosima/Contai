import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { CheckCircle2, AlertTriangle, X } from "lucide-react"
import { cn } from "@/lib/utils"

type ToastTone = "success" | "error"
interface Toast {
  id: number
  message: string
  tone: ToastTone
}

interface ToastCtx {
  toast: (message: string, tone?: ToastTone) => void
}

const Ctx = createContext<ToastCtx | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const id = Date.now() + Math.random()
      setToasts((t) => [...t, { id, message, tone }])
      window.setTimeout(() => remove(id), 3500)
    },
    [remove],
  )

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 sm:bottom-6">
          {toasts.map((t) => (
            <div
              key={t.id}
              role="status"
              className={cn(
                "pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg animate-in",
                t.tone === "success"
                  ? "border-[color:var(--color-income)]/30 bg-income-soft text-income"
                  : "border-[color:var(--color-expense)]/30 bg-expense-soft text-expense",
              )}
            >
              {t.tone === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              )}
              <span className="flex-1 text-foreground">{t.message}</span>
              <button
                onClick={() => remove(t.id)}
                aria-label="Fechar aviso"
                className="text-muted hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </Ctx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx.toast
}
