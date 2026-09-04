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
      className="overflow-hidden border-y border-border py-5 text-muted"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center">
          <Spinner className="h-5 w-5 text-primary" />
        </div>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <div className="mt-5 space-y-3" aria-hidden>
        <div className="h-3 w-2/5 animate-pulse rounded-full bg-surface-3" />
        <div className="h-12 w-full animate-pulse rounded-xl bg-surface-3" />
        <div className="h-12 w-4/5 animate-pulse rounded-xl bg-surface-3" />
      </div>
    </div>
  )
}

export function ErrorState({
  message = "Não foi possível carregar estes dados. Tente novamente.",
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 border-y border-border px-5 py-14 text-center"
      role="alert"
    >
      <div className="flex h-12 w-12 items-center justify-center text-expense">
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
      <div className="flex h-14 w-14 items-center justify-center text-subtle">
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
