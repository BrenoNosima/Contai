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
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-[-0.025em] text-foreground text-balance sm:text-[1.75rem]">
          {title}
        </h1>
        {subtitle && <p className="max-w-2xl text-sm leading-relaxed text-muted text-pretty">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 self-start sm:self-auto">{actions}</div>}
    </div>
  )
}
