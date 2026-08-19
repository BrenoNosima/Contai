import * as React from "react"
import { cn } from "@/lib/utils"

// ---------- Button ----------
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline"
type ButtonSize = "sm" | "md" | "icon"

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:brightness-110 active:brightness-95 font-medium",
  secondary:
    "bg-surface-3 text-foreground hover:bg-border-strong border border-border",
  outline:
    "bg-transparent text-foreground border border-border-strong hover:bg-surface-2",
  ghost: "bg-transparent text-muted hover:text-foreground hover:bg-surface-2",
  danger:
    "bg-expense-soft text-expense border border-[color:var(--color-expense)]/30 hover:bg-expense hover:text-primary-foreground",
}

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-11 px-4 text-sm gap-2 rounded-xl",
  icon: "h-10 w-10 rounded-xl justify-center",
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
        "inline-flex items-center justify-center whitespace-nowrap transition-all disabled:opacity-50 disabled:pointer-events-none select-none",
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
        "rounded-2xl p-5",
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
      "h-11 w-full rounded-xl border border-border bg-surface-2 px-3.5 text-sm text-foreground placeholder:text-subtle transition-colors focus:border-border-strong",
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
      "h-11 w-full appearance-none rounded-xl border border-border bg-surface-2 px-3.5 text-sm text-foreground transition-colors focus:border-border-strong",
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
      "w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-foreground placeholder:text-subtle transition-colors focus:border-border-strong resize-none",
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
