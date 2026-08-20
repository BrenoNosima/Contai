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
    <div className="mb-5 flex flex-col justify-between gap-3 sm:mb-7 sm:flex-row sm:items-end sm:gap-4">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-[-0.025em] text-foreground text-balance sm:text-[1.75rem]">
          {title}
        </h1>
        {subtitle && <p className="max-w-2xl text-sm leading-relaxed text-muted text-pretty max-sm:line-clamp-2">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center gap-2 self-start sm:w-auto sm:self-auto">
          {actions}
        </div>
      )}
    </div>
  )
}
