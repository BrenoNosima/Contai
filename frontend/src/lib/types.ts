// ---- Transactions ----
export type TransactionType = "income" | "expense"
export type TransactionStatus = "pending" | "paid"
export type Priority = "essential" | "desirable" | "superfluous"
export type Recurrence = "weekly" | "monthly"

export interface TransactionCreate {
  type: TransactionType
  description: string
  category: string
  amount: number
  priority?: Priority | null
  source?: string
  due_date?: string // YYYY-MM-DD
  status?: TransactionStatus
  is_recurring?: boolean
  recurrence?: Recurrence | null
}

export interface Transaction {
  id: number
  type: TransactionType
  description: string
  category: string
  amount: number
  priority: Priority | null
  source: string // "manual" | "ai" | "recurring"
  due_date: string
  status: TransactionStatus
  is_recurring: boolean
  recurrence: Recurrence | null
  parent_id: number | null
  fixed_expense_id: number | null
  user_id: number | null
  created_at: string
  updated_at: string
}

export interface TransactionFilters {
  type?: TransactionType
  category?: string
  status?: TransactionStatus
  start_date?: string
  end_date?: string
  is_recurring?: boolean
}

// ---- Goals ----
export type GoalStatus = "active" | "completed" | "overdue"

export interface GoalCreate {
  name: string
  target_amount: number
  current_amount?: number
  description?: string | null
  deadline?: string | null
}

export interface Goal {
  id: number
  name: string
  description: string | null
  target_amount: number
  current_amount: number
  deadline: string | null
  progress_percentage: number
  remaining_amount: number
  status: GoalStatus
  user_id: number | null
  created_at: string
  updated_at: string
}

// ---- Fixed expenses ----
export interface FixedExpenseCreate {
  name: string
  category: string
  amount: number
  billing_day: number
}

export interface FixedExpense {
  id: number
  name: string
  category: string
  amount: number
  billing_day: number
  active: boolean
  user_id: number | null
  created_at: string
  updated_at: string
}

// ---- Dashboard ----
export interface DashboardSummary {
  summary: {
    total_income: number
    total_expense: number
    balance: number
  }
  fixed_expenses_total: number
  goals_count: number
  expenses_by_category: { category: string; amount: number }[]
  recent_transactions: {
    id: number
    description: string
    category: string
    amount: number
    type: TransactionType
  }[]
}

// ---- Reports ----
export interface MonthlyTrendPoint {
  period: string
  month: string
  year: number
  income: number
  expense: number
  balance?: number
}

export interface CategoryBreakdown {
  month: number
  year: number
  expenses: { category: string; amount: number }[]
  income: { category: string; amount: number }[]
}

export interface ReportSummary {
  monthly: (MonthlyTrendPoint & { balance: number })[]
  categories: { category: string; amount: number }[]
  totals: {
    income: number
    expense: number
    net: number
  }
}

// ---- Chat ----
export interface ChatResponse {
  response: string
}

// ---- Domain metadata ----
export interface DomainOption<T extends string = string> {
  value: T
  label: string
}

export interface FinanceMetadata {
  categories: string[]
  transaction_types: DomainOption<TransactionType>[]
  statuses: DomainOption<TransactionStatus>[]
  priorities: DomainOption<Priority>[]
  recurrences: DomainOption<Recurrence>[]
}
