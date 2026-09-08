import { describe, expect, it, vi } from "vitest"
import type { Transaction } from "@/lib/types"
import {
  calendarDayStatusLabel,
  calendarMonthDistance,
  loadCalendarTransactions,
} from "./calendar"

describe("Calendário", () => {
  it("calcula corretamente a distância entre os meses", () => {
    const today = new Date(2026, 8, 8)
    expect(calendarMonthDistance(new Date(2026, 8, 1), today)).toBe(0)
    expect(calendarMonthDistance(new Date(2026, 9, 1), today)).toBe(1)
    expect(calendarMonthDistance(new Date(2025, 11, 1), today)).toBe(-9)
  })

  it("descreve dias com lançamentos de tipos e situações diferentes", () => {
    const items = [
      { type: "expense", status: "pending" },
      { type: "expense", status: "paid" },
      { type: "income", status: "paid" },
      { type: "income", status: "paid" },
    ] as Pick<Transaction, "type" | "status">[]

    expect(calendarDayStatusLabel(items)).toBe(
      "1 despesa pendente, 1 despesa paga, 2 receitas recebidas",
    )
  })

  it("lista os lançamentos existentes mesmo quando a geração falha", async () => {
    const transactions = [{ id: 1 }] as Transaction[]
    const api = {
      generateOccurrences: vi.fn().mockRejectedValue(new Error("indisponível")),
      list: vi.fn().mockResolvedValue(transactions),
    }

    await expect(loadCalendarTransactions({
      startISO: "2026-09-01",
      endISO: "2026-09-30",
      monthsAhead: 1,
      generateOccurrences: true,
      api,
    })).resolves.toBe(transactions)
    expect(api.generateOccurrences).toHaveBeenCalledWith(1)
    expect(api.list).toHaveBeenCalledWith({
      start_date: "2026-09-01",
      end_date: "2026-09-30",
    })
  })

  it("não gera ocorrências ao consultar um mês passado", async () => {
    const api = {
      generateOccurrences: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
    }

    await loadCalendarTransactions({
      startISO: "2026-08-01",
      endISO: "2026-08-31",
      monthsAhead: 1,
      generateOccurrences: false,
      api,
    })
    expect(api.generateOccurrences).not.toHaveBeenCalled()
  })
})
