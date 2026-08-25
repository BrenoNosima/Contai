import * as React from "react"
import { cn } from "@/lib/utils"

// ---------- Button ----------
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline"
type ButtonSize = "sm" | "md" | "icon"

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-[0_8px_20px_-14px_rgba(255,255,255,0.35)] hover:bg-[color:#f1f3f2] active:bg-white font-semibold",
  secondary:
    "bg-surface text-foreground hover:bg-surface-3 border border-border shadow-sm",
  outline:
    "bg-surface/40 text-foreground border border-border-strong hover:bg-surface-2 hover:border-primary/40",
  ghost: "bg-transparent text-muted hover:text-foreground hover:bg-surface-2",
  danger:
    "bg-expense-soft text-expense border border-[color:var(--color-expense)]/30 hover:bg-expense hover:text-primary-foreground",
}

const sizes: Record<ButtonSize, string> = {
  sm: "h-11 px-3 text-sm gap-1.5 rounded-xl sm:h-9 sm:rounded-lg",
  md: "h-11 px-4 text-sm gap-2 rounded-xl",
  icon: "h-11 w-11 rounded-xl justify-center sm:h-10 sm:w-10",
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
      "inline-flex touch-manipulation items-center justify-center whitespace-nowrap transition-all duration-200 disabled:pointer-events-none disabled:opacity-45 select-none [&>svg.lucide]:shrink-0",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
)
Button.displayName = "Button"

// ---------- Card ----------
export function Card({
  className,
  elevated = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { elevated?: boolean }) {
  return (
    <div
      className={cn(
        "relative rounded-2xl p-4 sm:p-5",
        elevated ? "card-elevated" : "card-elevated-2",
        className,
      )}
      {...props}
    />
  )
}

// ---------- Input ----------
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-base text-foreground shadow-sm outline-none placeholder:text-subtle transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 sm:text-sm",
      className,
    )}
    {...props}
  />
))
Input.displayName = "Input"

// ---------- Select ----------
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-11 w-full appearance-none rounded-xl border border-border bg-surface px-3.5 text-base text-foreground shadow-sm outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 sm:text-sm",
      className,
    )}
    {...props}
  >
    {children}
  </select>
))
Select.displayName = "Select"

// ---------- Textarea ----------
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full resize-none rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base text-foreground shadow-sm outline-none placeholder:text-subtle transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 sm:text-sm",
      className,
    )}
    {...props}
  />
))
Textarea.displayName = "Textarea"

// ---------- Label ----------
export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-xs font-medium text-muted", className)}
      {...props}
    />
  )
}

// ---------- Badge ----------
type BadgeTone = "income" | "expense" | "warning" | "neutral" | "muted"
const badgeTones: Record<BadgeTone, string> = {
  income: "bg-income-soft text-income",
  expense: "bg-expense-soft text-expense",
  warning: "bg-warning-soft text-warning",
  neutral: "bg-surface-3 text-muted",
  muted: "bg-surface-2 text-subtle border border-border",
}
export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        badgeTones[tone],
        className,
      )}
      {...props}
    />
  )
}

// ---------- Money ----------
export function Money({
  value,
  type,
  signed = false,
  className,
}: {
  value: number
  type?: "income" | "expense"
  signed?: boolean
  className?: string
}) {
  const tone =
    type === "income"
      ? "text-income"
      : type === "expense"
        ? "text-expense"
        : "text-foreground"
  const sign = signed ? (type === "expense" ? "-" : type === "income" ? "+" : "") : ""
  const abs = Math.abs(value ?? 0)
  const formatted = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(abs)
  return (
    <span className={cn("tnum font-medium", tone, className)}>
      {sign}
      {formatted}
    </span>
  )
}
