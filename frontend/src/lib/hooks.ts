import { useMutation, useQuery } from "@tanstack/react-query"
import { transactionsApi } from "./api"
import { qk, useInvalidateFinance } from "./query"
import { useToast } from "@/components/ui/toast"
import type {
  Transaction,
  TransactionCreate,
  TransactionFilters,
  TransactionStatus,
} from "./types"
import { ApiError } from "./api"

export function errMsg(e: unknown, fallback = "Algo deu errado."): string {
  if (e instanceof ApiError) return e.message
  if (e instanceof Error) return e.message
  return fallback
}

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery({
    queryKey: qk.transactions(filters),
    queryFn: () => transactionsApi.list(filters),
  })
}

export function useTransactionMutations() {
  const invalidate = useInvalidateFinance()
  const toast = useToast()

  const create = useMutation({
    mutationFn: (data: TransactionCreate) => transactionsApi.create(data),
    onSuccess: () => {
      invalidate()
      toast("Lançamento adicionado.")
    },
    onError: (e) => toast(errMsg(e), "error"),
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TransactionCreate> }) =>
      transactionsApi.update(id, data),
    onSuccess: () => {
      invalidate()
      toast("Lançamento atualizado.")
    },
    onError: (e) => toast(errMsg(e), "error"),
  })

  const remove = useMutation({
    mutationFn: (id: number) => transactionsApi.remove(id),
    onSuccess: () => {
      invalidate()
      toast("Lançamento removido.")
    },
    onError: (e) => toast(errMsg(e), "error"),
  })

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: TransactionStatus }) =>
      transactionsApi.setStatus(id, status),
    onSuccess: (_data, vars) => {
      invalidate()
      toast(vars.status === "paid" ? "Marcado como pago." : "Marcado como pendente.")
    },
    onError: (e) => toast(errMsg(e), "error"),
  })

  const toggleStatus = (tx: Transaction) =>
    setStatus.mutate({
      id: tx.id,
      status: tx.status === "paid" ? "pending" : "paid",
    })

  return { create, update, remove, setStatus, toggleStatus }
}
