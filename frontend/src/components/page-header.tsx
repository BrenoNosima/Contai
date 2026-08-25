import type { ReactNode } from "react"

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-8 sm:flex-row sm:items-end sm:gap-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-[-0.025em] text-foreground text-balance sm:text-[1.875rem]">
          {title}
        </h1>
        {subtitle && <p className="max-w-2xl text-sm leading-relaxed text-muted text-pretty max-sm:line-clamp-2">{subtitle}</p>}
      </div>
      {actions && (
        <div className="grid w-full grid-cols-2 items-center gap-2 self-start [&>*:only-child]:col-span-2 sm:flex sm:w-auto sm:flex-wrap sm:self-auto">
          {actions}
        </div>
      )}
    </div>
  )
}
