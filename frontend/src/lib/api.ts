import type {
  CategoryBreakdown,
  ChatResponse,
  DashboardSummary,
  FixedExpense,
  FixedExpenseCreate,
  Goal,
  GoalCreate,
  MonthlyTrendPoint,
  Transaction,
  TransactionCreate,
  TransactionFilters,
  TransactionStatus,
} from "./types"

/**
 * In dev we hit the Vite proxy at `/api` -> VITE_API_URL (default http://localhost:8000).
 * In prod, VITE_API_URL can point directly at the backend.
 */
const RAW_BASE = import.meta.env.VITE_API_URL as string | undefined
const BASE = RAW_BASE ? RAW_BASE.replace(/\/$/, "") : "/api"

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = "ApiError"
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    })
  } catch {
    throw new ApiError(
      "Não foi possível conectar ao servidor. Verifique se a API está no ar.",
      0,
    )
  }

  if (!res.ok) {
    let detail = `Erro ${res.status}`
    try {
      const body = await res.json()
      if (body?.detail) detail = typeof body.detail === "string" ? body.detail : detail
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, res.status)
  }

  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

function toQuery(params: Record<string, unknown>): string {
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue
    usp.set(k, String(v))
  }
  const s = usp.toString()
  return s ? `?${s}` : ""
}

// ---------- Transactions ----------
export const transactionsApi = {
  list: (filters: TransactionFilters = {}) =>
    request<Transaction[]>(`/transactions/${toQuery(filters as Record<string, unknown>)}`),
  get: (id: number) => request<Transaction>(`/transactions/${id}`),
  create: (data: TransactionCreate) =>
    request<Transaction>(`/transactions/`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<TransactionCreate>) =>
    request<Transaction>(`/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  setStatus: (id: number, status: TransactionStatus) =>
    request<Transaction>(`/transactions/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  remove: (id: number) =>
    request<void>(`/transactions/${id}`, { method: "DELETE" }),
  generateOccurrences: (monthsAhead = 3) =>
    request<unknown>(`/transactions/generate-occurrences?months_ahead=${monthsAhead}`, {
      method: "POST",
    }),
  fromText: (text: string) =>
    request<Transaction>(`/transactions/text`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
}

// ---------- Goals ----------
export const goalsApi = {
  list: () => request<Goal[]>(`/goals/`),
  get: (id: number) => request<Goal>(`/goals/${id}`),
  create: (data: GoalCreate) =>
    request<Goal>(`/goals/`, { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<GoalCreate>) =>
    request<Goal>(`/goals/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: number) => request<void>(`/goals/${id}`, { method: "DELETE" }),
  addProgress: (id: number, amount: number) =>
    request<Goal>(`/goals/${id}/progress${toQuery({ amount })}`, {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),
}

// ---------- Fixed expenses ----------
export const fixedExpensesApi = {
  list: () => request<FixedExpense[]>(`/fixed-expenses/`),
  listActive: () => request<FixedExpense[]>(`/fixed-expenses/active`),
  create: (data: FixedExpenseCreate) =>
    request<FixedExpense>(`/fixed-expenses/`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<FixedExpenseCreate>) =>
    request<FixedExpense>(`/fixed-expenses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  remove: (id: number) =>
    request<void>(`/fixed-expenses/${id}`, { method: "DELETE" }),
}

// ---------- Dashboard ----------
export const dashboardApi = {
  summary: () => request<DashboardSummary>(`/dashboard/`),
  topCategory: () => request<unknown>(`/dashboard/top-category`),
  insights: () => request<unknown>(`/dashboard/insights`),
}

// ---------- Reports ----------
export const reportsApi = {
  monthlyTrend: (months = 6) =>
    request<MonthlyTrendPoint[]>(`/reports/monthly-trend?months=${months}`),
  monthlyBalance: (months = 6) =>
    request<MonthlyTrendPoint[]>(`/reports/monthly-balance?months=${months}`),
  categoryBreakdown: (month?: number, year?: number) =>
    request<CategoryBreakdown>(`/reports/category-breakdown${toQuery({ month, year })}`),
}

// ---------- Chat ----------
export const chatApi = {
  send: (message: string, chatHistory: { role: "user" | "assistant"; content: string }[] = []) =>
    request<ChatResponse>(`/chat/`, {
      method: "POST",
      body: JSON.stringify({ message, chat_history: chatHistory }),
    }),
}
