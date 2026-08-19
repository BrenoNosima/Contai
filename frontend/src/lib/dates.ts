import {
  differenceInCalendarDays,
  format,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
} from "date-fns"
import { ptBR } from "date-fns/locale"

/** Parse a "YYYY-MM-DD" (or ISO) string as a local date, avoiding TZ drift. */
export function parseDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number)
    return new Date(y, m - 1, d)
  }
  return parseISO(value)
}

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd")
}

export function fmtDate(value: string, pattern = "dd 'de' MMM"): string {
  return format(parseDate(value), pattern, { locale: ptBR })
}

export function fmtLongDate(value: string): string {
  return format(parseDate(value), "EEEE, dd 'de' MMMM", { locale: ptBR })
}

/** Human relative label for a due date: Vencido, Hoje, Amanhã, Em X dias… */
export function dueLabel(value: string): {
  text: string
  tone: "expense" | "warning" | "neutral" | "income"
} {
  const date = parseDate(value)
  const diff = differenceInCalendarDays(date, new Date())
  if (diff < 0) {
    const abs = Math.abs(diff)
    return {
      text: isYesterday(date) ? "Venceu ontem" : `Venceu há ${abs} ${abs === 1 ? "dia" : "dias"}`,
      tone: "expense",
    }
  }
  if (isToday(date)) return { text: "Vence hoje", tone: "warning" }
  if (isTomorrow(date)) return { text: "Vence amanhã", tone: "warning" }
  if (diff <= 5) return { text: `Vence em ${diff} dias`, tone: "warning" }
  return { text: fmtDate(value), tone: "neutral" }
}

export function isOverdue(value: string): boolean {
  return differenceInCalendarDays(parseDate(value), new Date()) < 0
}
