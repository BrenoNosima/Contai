import { useQuery } from "@tanstack/react-query"
import { metadataApi } from "./api"
import { CATEGORY_SUGGESTIONS } from "./categories"
import { qk } from "./query"
import type { FinanceMetadata } from "./types"


const FALLBACK: FinanceMetadata = {
  categories: CATEGORY_SUGGESTIONS,
  transaction_types: [
    { value: "income", label: "Receita" },
    { value: "expense", label: "Despesa" },
  ],
  statuses: [
    { value: "pending", label: "Pendente" },
    { value: "paid", label: "Pago" },
  ],
  priorities: [
    { value: "essential", label: "Essencial" },
    { value: "desirable", label: "Desejável" },
    { value: "superfluous", label: "Supérfluo" },
  ],
  recurrences: [
    { value: "weekly", label: "Semanal" },
    { value: "monthly", label: "Mensal" },
  ],
}


export function useFinanceMetadata(): FinanceMetadata {
  const query = useQuery({
    queryKey: qk.financeMetadata,
    queryFn: metadataApi.finance,
    staleTime: Infinity,
  })

  return query.data ?? FALLBACK
}
