import type {
  ChatResponse,
  DashboardSummary,
  FixedExpense,
  FixedExpenseCreate,
  FinanceMetadata,
  Goal,
  GoalCreate,
  ReportSummary,
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
let csrfToken: string | null = null

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken
  const response = await fetch(`${BASE}/auth/csrf`, { credentials: "include" })
  if (!response.ok) throw new ApiError("Não foi possível iniciar uma sessão segura.", response.status)
  const body = await response.json() as { csrf_token: string }
  csrfToken = body.csrf_token
  return csrfToken
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = "ApiError"
  }
}

async function request<T>(path: string, init?: RequestInit, retryAuthentication = true): Promise<T> {
  let res: Response
  try {
    const method = (init?.method ?? "GET").toUpperCase()
    const mutating = ["POST", "PUT", "PATCH", "DELETE"].includes(method)
    const csrf = mutating ? await getCsrfToken() : null
    res = await fetch(`${BASE}${path}`, {
      credentials: "include",
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiError(
      "Não foi possível conectar ao servidor. Verifique se a API está no ar.",
      0,
    )
  }

  if (!res.ok) {
    if (res.status === 401 && retryAuthentication && (path === "/auth/me" || !path.startsWith("/auth/"))) {
      try {
        await request<AuthUser>("/auth/refresh", { method: "POST", body: "{}" }, false)
        return request<T>(path, init, false)
      } catch {
        // The auth provider will move the user back to login below.
      }
    }
    if (res.status === 401 && !path.startsWith("/auth/")) {
      window.dispatchEvent(new Event("auth:unauthorized"))
    }
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

export interface AuthUser {
  id: number
  name: string
  email: string
  created_at: string
}

export const authApi = {
  me: () => request<AuthUser>("/auth/me"),
  login: (email: string, password: string) =>
    request<AuthUser>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string, passwordConfirmation: string) =>
    request<AuthUser>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, password_confirmation: passwordConfirmation }),
    }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  refresh: () => request<AuthUser>("/auth/refresh", { method: "POST", body: "{}" }, false),
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
  create: (data: TransactionCreate) =>
    request<Transaction>(`/transactions/`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<TransactionCreate>) =>
    request<Transaction>(`/transactions/${id}`, {
      method: "PATCH",
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
    request<Transaction[]>(`/transactions/generate-occurrences?months_ahead=${monthsAhead}`, {
      method: "POST",
    }),
}

// ---------- Goals ----------
export const goalsApi = {
  list: () => request<Goal[]>(`/goals/`),
  create: (data: GoalCreate) =>
    request<Goal>(`/goals/`, { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<GoalCreate>) =>
    request<Goal>(`/goals/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  remove: (id: number) => request<void>(`/goals/${id}`, { method: "DELETE" }),
  addProgress: (id: number, amount: number) =>
    request<Goal>(`/goals/${id}/progress`, {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),
}

// ---------- Fixed expenses ----------
export const fixedExpensesApi = {
  list: () => request<FixedExpense[]>(`/fixed-expenses/`),
  create: (data: FixedExpenseCreate) =>
    request<FixedExpense>(`/fixed-expenses/`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<FixedExpenseCreate>) =>
    request<FixedExpense>(`/fixed-expenses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  remove: (id: number) =>
    request<void>(`/fixed-expenses/${id}`, { method: "DELETE" }),
}

// ---------- Dashboard ----------
export const dashboardApi = {
  summary: () => request<DashboardSummary>(`/dashboard/`),
}

// ---------- Reports ----------
export const reportsApi = {
  summary: (months = 6) =>
    request<ReportSummary>(`/reports/summary?months=${months}`),
}

// ---------- Chat ----------
export const chatApi = {
  send: (message: string, chatHistory: { role: "user" | "assistant"; content: string }[] = []) =>
    request<ChatResponse>(`/chat/`, {
      method: "POST",
      body: JSON.stringify({ message, chat_history: chatHistory }),
    }),
}

export const assistantActionsApi = {
  confirm: (id: string) => request<import("./types").AssistantAction>(`/assistant-actions/${id}/confirm`, { method: "POST", body: "{}" }),
  reject: (id: string) => request<import("./types").AssistantAction>(`/assistant-actions/${id}`, { method: "DELETE" }),
}

// ---------- Metadata ----------
export const metadataApi = {
  finance: () => request<FinanceMetadata>(`/metadata/finance`),
}
