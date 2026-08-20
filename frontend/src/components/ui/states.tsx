import type { ReactNode } from "react"
import { AlertTriangle, Inbox, Loader2, RefreshCw } from "lucide-react"
import { Button } from "./primitives"
import { cn } from "@/lib/utils"

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("animate-spin", className)} aria-hidden />
}

export function LoadingState({ label = "Carregando…" }: { label?: string }) {
  return (
    <div
      className="card-elevated-2 flex flex-col items-center justify-center gap-3 rounded-2xl py-16 text-muted"
      role="status"
      aria-live="polite"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
        <Spinner className="h-5 w-5 text-primary" />
      </div>
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function ErrorState({
  message = "Algo deu errado.",
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div
      className="card-elevated-2 flex flex-col items-center justify-center gap-3 rounded-2xl px-5 py-14 text-center"
      role="alert"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-expense-soft text-expense">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </div>
      <p className="max-w-sm text-sm text-muted">{message}</p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" aria-hidden /> Tentar de novo
        </Button>
      )}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-5 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface-3/70 text-subtle shadow-inner">
        {icon ?? <Inbox className="h-7 w-7" aria-hidden />}
      </div>
      <div className="space-y-1">
        <p className="text-base font-medium text-foreground">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}
