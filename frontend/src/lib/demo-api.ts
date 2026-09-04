import type { AuthUser, PrivacyInformation } from "./api"
import type { FixedExpense, Goal, Transaction } from "./types"

const iso = (offset: number) => {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}
const now = new Date().toISOString()

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true"

const demoUser: AuthUser = { id: 1, name: "Marina Demo", email: "marina@demo.contai", created_at: now, must_change_password: false }
let transactions: Transaction[] = [
  { id: 1, type: "income", description: "Salário", category: "Salário", amount: 6200, priority: null, source: "manual", due_date: iso(-4), status: "paid", settled_at: iso(-4), is_recurring: true, recurrence: "monthly", parent_id: null, fixed_expense_id: null, installment_group_id: null, installment_number: null, installment_count: null, user_id: 1, created_at: now, updated_at: now },
  { id: 2, type: "expense", description: "Aluguel", category: "Moradia", amount: 1850, priority: "essential", source: "manual", due_date: iso(-2), status: "paid", settled_at: iso(-2), is_recurring: true, recurrence: "monthly", parent_id: null, fixed_expense_id: 1, installment_group_id: null, installment_number: null, installment_count: null, user_id: 1, created_at: now, updated_at: now },
  { id: 3, type: "expense", description: "Supermercado", category: "Alimentação", amount: 486.7, priority: "essential", source: "manual", due_date: iso(-1), status: "paid", settled_at: iso(-1), is_recurring: false, recurrence: null, parent_id: null, fixed_expense_id: null, installment_group_id: null, installment_number: null, installment_count: null, user_id: 1, created_at: now, updated_at: now },
  { id: 4, type: "expense", description: "Energia elétrica", category: "Moradia", amount: 214.3, priority: "essential", source: "manual", due_date: iso(3), status: "pending", settled_at: null, is_recurring: false, recurrence: null, parent_id: null, fixed_expense_id: null, installment_group_id: null, installment_number: null, installment_count: null, user_id: 1, created_at: now, updated_at: now },
  { id: 5, type: "expense", description: "Internet", category: "Assinaturas", amount: 119.9, priority: "essential", source: "manual", due_date: iso(7), status: "pending", settled_at: null, is_recurring: true, recurrence: "monthly", parent_id: null, fixed_expense_id: 2, installment_group_id: null, installment_number: null, installment_count: null, user_id: 1, created_at: now, updated_at: now },
  { id: 6, type: "expense", description: "Plano de saúde", category: "Saúde", amount: 389.9, priority: "essential", source: "manual", due_date: iso(10), status: "pending", settled_at: null, is_recurring: true, recurrence: "monthly", parent_id: null, fixed_expense_id: null, installment_group_id: null, installment_number: null, installment_count: null, user_id: 1, created_at: now, updated_at: now },
  { id: 7, type: "expense", description: "Curso de inglês", category: "Educação", amount: 240, priority: "desirable", source: "manual", due_date: iso(14), status: "pending", settled_at: null, is_recurring: true, recurrence: "monthly", parent_id: null, fixed_expense_id: null, installment_group_id: null, installment_number: null, installment_count: null, user_id: 1, created_at: now, updated_at: now },
]
let goals: Goal[] = [
  { id: 1, name: "Reserva de emergência", description: "Seis meses de despesas essenciais", target_amount: 18000, current_amount: 7200, deadline: iso(240), progress_percentage: 40, remaining_amount: 10800, status: "active", user_id: 1, created_at: now, updated_at: now },
  { id: 2, name: "Viagem", description: "Férias no fim do ano", target_amount: 6000, current_amount: 3900, deadline: iso(120), progress_percentage: 65, remaining_amount: 2100, status: "active", user_id: 1, created_at: now, updated_at: now },
]
let fixedExpenses: FixedExpense[] = [
  { id: 1, name: "Aluguel", category: "Moradia", amount: 1850, billing_day: 5, active: true, user_id: 1, created_at: now, updated_at: now },
  { id: 2, name: "Internet", category: "Assinaturas", amount: 119.9, billing_day: 12, active: true, user_id: 1, created_at: now, updated_at: now },
]
const demoActions = new Map<string, import("./types").AssistantAction>()

const body = (init?: RequestInit) => init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {}
const nextId = (items: { id: number }[]) => Math.max(0, ...items.map((item) => item.id)) + 1

export async function demoRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const url = new URL(path, "http://demo.local")
  const method = (init?.method ?? "GET").toUpperCase()
  const data = body(init)

  if (url.pathname.startsWith("/auth/")) return (method === "DELETE" ? undefined : demoUser) as T
  if (url.pathname === "/privacy") return ({ controller: "Contaí", contact: "privacidade@contai.app", country: "Brasil", ai_provider: "Groq", ai_destination: "Estados Unidos", policy_version: "demo" } satisfies PrivacyInformation) as T
  if (url.pathname === "/metadata/finance") return ({ categories: ["Alimentação", "Assinaturas", "Educação", "Lazer", "Moradia", "Salário", "Saúde", "Transporte"], transaction_types: [{ value: "income", label: "Receita" }, { value: "expense", label: "Despesa" }], statuses: [{ value: "paid", label: "Concluído" }, { value: "pending", label: "Pendente" }], priorities: [{ value: "essential", label: "Essencial" }, { value: "desirable", label: "Desejável" }, { value: "superfluous", label: "Supérflua" }], recurrences: [{ value: "weekly", label: "Semanal" }, { value: "monthly", label: "Mensal" }] }) as T

  if (url.pathname === "/transactions/" && method === "GET") {
    let result = [...transactions]
    for (const key of ["type", "status"] as const) { const value = url.searchParams.get(key); if (value) result = result.filter((item) => item[key] === value) }
    const start = url.searchParams.get("start_date"); const end = url.searchParams.get("end_date")
    if (start) result = result.filter((item) => item.due_date >= start)
    if (end) result = result.filter((item) => item.due_date <= end)
    return result as T
  }
  if (url.pathname === "/transactions/" && method === "POST") {
    const item = { ...data, id: nextId(transactions), source: "manual", due_date: data.due_date || iso(0), status: data.status || "pending", settled_at: null, is_recurring: Boolean(data.is_recurring), recurrence: data.recurrence || null, parent_id: null, fixed_expense_id: null, installment_group_id: null, installment_number: null, installment_count: null, user_id: 1, created_at: now, updated_at: now } as Transaction
    transactions = [item, ...transactions]; return item as T
  }
  if (url.pathname === "/transactions/generate-occurrences" && method === "POST") return [] as T
  if (url.pathname === "/transactions/installments" && method === "POST") {
    const count = Number(data.installment_count || 1); const total = Number(data.total_amount || 0)
    const created = Array.from({ length: count }, (_, index) => ({ ...data, id: nextId(transactions) + index, type: "expense", amount: total / count, source: "manual", due_date: String(data.first_due_date || iso(0)), status: "pending", settled_at: null, is_recurring: false, recurrence: null, parent_id: null, fixed_expense_id: null, installment_group_id: "demo-installments", installment_number: index + 1, installment_count: count, user_id: 1, created_at: now, updated_at: now })) as Transaction[]
    transactions = [...created, ...transactions]; return created as T
  }
  if (url.pathname.startsWith("/transactions/installments/")) return transactions.filter((item) => item.installment_group_id === url.pathname.split("/").pop()) as T
  const transactionMatch = url.pathname.match(/^\/transactions\/(\d+)(?:\/status)?$/)
  if (transactionMatch) {
    const id = Number(transactionMatch[1]); const current = transactions.find((item) => item.id === id)!
    if (method === "DELETE") { transactions = transactions.filter((item) => item.id !== id); return undefined as T }
    const updated = { ...current, ...data, updated_at: now } as Transaction
    transactions = transactions.map((item) => item.id === id ? updated : item); return updated as T
  }
  if (url.pathname === "/transactions/period-summary") {
    const paid = transactions.filter((item) => item.status === "paid"); const pending = transactions.filter((item) => item.status === "pending")
    return ({ income: paid.filter((item) => item.type === "income").reduce((s, i) => s + i.amount, 0), expense: paid.filter((item) => item.type === "expense").reduce((s, i) => s + i.amount, 0), balance: paid.reduce((s, i) => s + (i.type === "income" ? i.amount : -i.amount), 0), pending_income: pending.filter((i) => i.type === "income").reduce((s, i) => s + i.amount, 0), pending_expense: pending.filter((i) => i.type === "expense").reduce((s, i) => s + i.amount, 0) }) as T
  }
  if (url.pathname === "/dashboard/") {
    const paid = transactions.filter((item) => item.status === "paid"); const income = paid.filter((i) => i.type === "income").reduce((s, i) => s + i.amount, 0); const expense = paid.filter((i) => i.type === "expense").reduce((s, i) => s + i.amount, 0)
    return ({ summary: { total_income: income, total_expense: expense, balance: income - expense }, recent_transactions: paid.slice(0, 3) }) as T
  }

  if (url.pathname === "/goals/" && method === "GET") return goals as T
  if (url.pathname === "/fixed-expenses/" && method === "GET") return fixedExpenses as T
  if (url.pathname === "/reports/summary") return ({ monthly: Array.from({ length: 6 }, (_, index) => ({ period: `${index + 1}`, month: ["Abr", "Mai", "Jun", "Jul", "Ago", "Set"][index], year: new Date().getFullYear(), income: 5800 + index * 80, expense: 3600 + index * 115, balance: 2200 - index * 35 })), categories: [{ category: "Moradia", amount: 2064.3 }, { category: "Alimentação", amount: 486.7 }, { category: "Assinaturas", amount: 119.9 }], totals: { income: 6200, expense: 2670.9, net: 3529.1 } }) as T
  if (url.pathname === "/chat/") {
    const message = String(data.message || "").toLocaleLowerCase("pt-BR")
    if (message.includes("registre") || message.includes("adicione") || message.includes("lançamento")) {
      const action = { id: crypto.randomUUID(), action: "create_transaction", payload: { type: "expense", description: "Transporte", category: "Transporte", amount: 50, due_date: iso(0), status: "paid" }, status: "pending", expires_at: new Date(Date.now() + 600_000).toISOString() } satisfies import("./types").AssistantAction
      demoActions.set(action.id, action)
      return ({ response: "Preparei este lançamento com dados de demonstração. Revise os campos antes de confirmar.", pending_actions: [action] }) as T
    }
    return ({ response: "No modo demonstração, esta resposta usa somente os dados fictícios exibidos no aplicativo.", pending_actions: [] }) as T
  }
  const actionMatch = url.pathname.match(/^\/assistant-actions\/([^/]+)(?:\/confirm)?$/)
  if (actionMatch) {
    const action = demoActions.get(actionMatch[1])!
    const updated = { ...action, status: method === "DELETE" ? "rejected" : "confirmed" } as import("./types").AssistantAction
    demoActions.delete(actionMatch[1])
    if (updated.status === "confirmed" && updated.action === "create_transaction") await demoRequest("/transactions/", { method: "POST", body: JSON.stringify(updated.payload) })
    return updated as T
  }

  const goalMatch = url.pathname.match(/^\/goals\/(\d+)(?:\/progress)?$/)
  if (goalMatch) {
    const id = Number(goalMatch[1]); const current = goals.find((item) => item.id === id)!
    if (method === "DELETE") { goals = goals.filter((item) => item.id !== id); return undefined as T }
    const currentAmount = url.pathname.endsWith("/progress") ? current.current_amount + Number(data.amount || 0) : Number(data.current_amount ?? current.current_amount)
    const target = Number(data.target_amount ?? current.target_amount)
    const updated = { ...current, ...data, current_amount: currentAmount, target_amount: target, progress_percentage: Math.min(100, (currentAmount / target) * 100), remaining_amount: Math.max(0, target - currentAmount), updated_at: now } as Goal
    goals = goals.map((item) => item.id === id ? updated : item); return updated as T
  }
  const fixedMatch = url.pathname.match(/^\/fixed-expenses\/(\d+)$/)
  if (fixedMatch) {
    const id = Number(fixedMatch[1]); const current = fixedExpenses.find((item) => item.id === id)!
    if (method === "DELETE") { fixedExpenses = fixedExpenses.filter((item) => item.id !== id); return undefined as T }
    const updated = { ...current, ...data, updated_at: now } as FixedExpense
    fixedExpenses = fixedExpenses.map((item) => item.id === id ? updated : item); return updated as T
  }

  const collection = url.pathname.startsWith("/goals/") ? goals : url.pathname.startsWith("/fixed-expenses/") ? fixedExpenses : null
  if (collection && method === "POST") {
    const id = nextId(collection); const item = { ...data, id, active: true, current_amount: Number(data.current_amount || 0), progress_percentage: 0, remaining_amount: Number(data.target_amount || 0), status: "active", user_id: 1, created_at: now, updated_at: now } as Goal & FixedExpense
    if (url.pathname.startsWith("/goals/")) goals = [item, ...goals]; else fixedExpenses = [item, ...fixedExpenses]
    return item as T
  }
  throw new Error(`Rota demo não implementada: ${method} ${url.pathname}`)
}
