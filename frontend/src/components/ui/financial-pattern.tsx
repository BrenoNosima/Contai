import { cn } from "@/lib/utils"

type PatternTone = "primary" | "income" | "expense" | "warning" | "neutral"

const tones: Record<PatternTone, string> = {
  primary: "text-primary",
  income: "text-income",
  expense: "text-expense",
  warning: "text-warning",
  neutral: "text-muted",
}

export function FinancialOrbit({
  tone = "primary",
  className,
}: {
  tone?: PatternTone
  className?: string
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute -right-12 -top-14 h-44 w-44 opacity-25",
        tones[tone],
        className,
      )}
      aria-hidden
    >
      <span className="absolute inset-5 rounded-full border border-current/40" />
      <span className="absolute inset-10 rounded-full border border-current/25" />
      <span className="absolute inset-[4.25rem] rounded-full bg-current shadow-[0_0_32px_currentColor]" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 176 176" fill="none">
        <ellipse
          cx="88"
          cy="88"
          rx="84"
          ry="35"
          stroke="currentColor"
          strokeOpacity="0.35"
          transform="rotate(-24 88 88)"
        />
      </svg>
    </div>
  )
}

export function FinancialGrid({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 opacity-[0.055]",
        className,
      )}
      style={{
        backgroundImage:
          "linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        maskImage: "linear-gradient(to bottom left, black, transparent 70%)",
      }}
      aria-hidden
    />
  )
}
