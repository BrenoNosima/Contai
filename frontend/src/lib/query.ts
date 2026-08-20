import { QueryClient, useQueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

export const qk = {
  dashboard: ["dashboard"] as const,
  transactions: (filters?: unknown) =>
    filters ? (["transactions", filters] as const) : (["transactions"] as const),
  goals: ["goals"] as const,
  fixedExpenses: ["fixed-expenses"] as const,
  reports: (months?: number) =>
    months ? (["reports", months] as const) : (["reports"] as const),
  financeMetadata: ["metadata", "finance"] as const,
}

/** Invalidate only the query domains affected by each mutation. */
export function useFinanceInvalidation() {
  const client = useQueryClient()

  const transactions = () => {
    client.invalidateQueries({ queryKey: qk.transactions() })
    client.invalidateQueries({ queryKey: qk.dashboard })
    client.invalidateQueries({ queryKey: qk.reports() })
  }

  const goals = () => {
    client.invalidateQueries({ queryKey: qk.goals })
    client.invalidateQueries({ queryKey: qk.dashboard })
  }

  const fixedExpenses = () => {
    client.invalidateQueries({ queryKey: qk.fixedExpenses })
    client.invalidateQueries({ queryKey: qk.dashboard })
    client.invalidateQueries({ queryKey: qk.transactions() })
    client.invalidateQueries({ queryKey: qk.reports() })
  }

  const allFinance = () => {
    transactions()
    client.invalidateQueries({ queryKey: qk.goals })
    client.invalidateQueries({ queryKey: qk.fixedExpenses })
  }

  return { transactions, goals, fixedExpenses, allFinance }
}
