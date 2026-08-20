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

/**
 * Invalidate everything that can change when money moves — a status flip, a new
 * transaction, a goal update, etc. Keeps Overview/Calendar/Reports in sync.
 */
export function useInvalidateFinance() {
  const client = useQueryClient()
  return () => {
    client.invalidateQueries({ queryKey: ["transactions"] })
    client.invalidateQueries({ queryKey: ["dashboard"] })
    client.invalidateQueries({ queryKey: ["reports"] })
    client.invalidateQueries({ queryKey: ["goals"] })
    client.invalidateQueries({ queryKey: ["fixed-expenses"] })
  }
}
