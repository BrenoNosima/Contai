import { useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useQuery } from "@tanstack/react-query"
import { qk } from "@/lib/query"
import { reportsApi } from "@/lib/api"
import { PageHeader } from "@/components/page-header"
import { Card } from "@/components/ui/primitives"
import { ErrorState, LoadingState } from "@/components/ui/states"
import { formatMoney } from "@/lib/utils"
import { categoryMeta } from "@/lib/categories"
import { FinancialGrid, FinancialOrbit } from "@/components/ui/financial-pattern"

const RANGE_OPTIONS = [
  { value: 3, label: "3 meses" },
  { value: 6, label: "6 meses" },
  { value: 12, label: "12 meses" },
]

const PIE_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-danger)",
  "var(--color-accent)",
]

export default function ReportsPage() {
  const [range, setRange] = useState(6)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: qk.reports(range),
    queryFn: () => reportsApi.summary(range),
  })

  const { monthly, categories, totals, trend } = useMemo(() => {
    const monthly = (data?.monthly ?? []).map((item) => ({
      ...item,
      label: item.month.toLowerCase(),
    }))
    const categories = (data?.categories ?? []).map((item) => ({
      category: item.category,
      value: item.amount,
      label: categoryMeta(item.category).label,
    }))
    let running = 0
    const trend = monthly.map((item) => {
      running += item.balance
      return { label: item.label, balance: running }
    })

    return {
      monthly,
      categories,
      totals: data?.totals ?? { income: 0, expense: 0, net: 0 },
      trend,
    }
  }, [data])

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Relatórios" subtitle="Entenda para onde seu dinheiro vai." />
        <LoadingState label="Calculando seus números..." />
      </div>
    )
  }

  if (isError) {
    return (
      <div>
        <PageHeader title="Relatórios" subtitle="Entenda para onde seu dinheiro vai." />
        <ErrorState onRetry={() => refetch()} />
      </div>
    )
  }

  const topCategory = categories[0]

  return (
    <div>
      <PageHeader
        title="Relatórios"
        subtitle="Entenda para onde seu dinheiro vai."
        actions={
          <div className="flex rounded-xl border border-border bg-surface-2/70 p-1 shadow-inner">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  range === opt.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted hover:bg-surface-3 hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Entradas no período" value={totals.income} tone="income" />
        <SummaryCard label="Saídas no período" value={totals.expense} tone="expense" />
        <SummaryCard label="Saldo líquido" value={totals.net} tone={totals.net >= 0 ? "income" : "expense"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5 transition-colors hover:border-border-strong">
          <h2 className="font-sans text-base font-semibold text-foreground">Entradas x Saídas</h2>
          <p className="mb-4 text-sm text-muted">Comparativo mensal dos últimos {range} meses.</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--color-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="var(--color-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-surface-2)" }} />
                <Legend wrapperStyle={{ fontSize: 12, color: "var(--color-muted)" }} />
                <Bar dataKey="income" name="Entradas" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Saídas" fill="var(--color-danger)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 transition-colors hover:border-border-strong">
          <h2 className="font-sans text-base font-semibold text-foreground">Evolução do saldo</h2>
          <p className="mb-4 text-sm text-muted">Saldo acumulado ao longo do período.</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--color-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="var(--color-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--color-border)" }} />
                <Line
                  type="monotone"
                  dataKey="balance"
                  name="Saldo"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  dot={{ fill: "var(--color-primary)", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 transition-colors hover:border-border-strong lg:col-span-2">
          <h2 className="font-sans text-base font-semibold text-foreground">Gastos por categoria</h2>
          <p className="mb-4 text-sm text-muted">
            {topCategory
              ? `Sua maior saída foi em ${topCategory.label} (${formatMoney(topCategory.value)}).`
              : "Sem saídas registradas no período."}
          </p>
          {categories.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">Nenhuma saída paga no período selecionado.</p>
          ) : (
            <div className="grid items-center gap-6 md:grid-cols-2">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categories}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      stroke="var(--color-surface)"
                      strokeWidth={2}
                    >
                      {categories.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex flex-col gap-2">
                {categories.map((c, i) => {
                  const pct = totals.expense > 0 ? (c.value / totals.expense) * 100 : 0
                  const meta = categoryMeta(c.category)
                  return (
                    <li key={c.category} className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                        aria-hidden
                      />
                      <span className="flex-1 text-sm text-foreground">{meta?.label ?? c.label}</span>
                      <span className="font-mono text-sm text-muted">{pct.toFixed(0)}%</span>
                      <span className="w-24 text-right font-mono text-sm text-foreground">
                        {formatMoney(c.value)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: "income" | "expense" }) {
  return (
    <Card className="relative min-h-32 overflow-hidden p-4 transition-all hover:-translate-y-0.5 hover:border-border-strong">
      <FinancialGrid />
      <FinancialOrbit tone={tone} className="-right-20 -top-20" />
      <p className="relative z-10 text-sm text-muted">{label}</p>
      <p
        className={`relative z-10 mt-5 font-mono text-2xl font-semibold ${tone === "income" ? "text-income" : "text-danger"}`}
      >
        {formatMoney(value)}
      </p>
      <span
        className={`absolute inset-y-4 left-0 w-0.5 rounded-full ${tone === "income" ? "bg-income" : "bg-expense"}`}
        aria-hidden
      />
    </Card>
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 shadow-lg">
      {label && <p className="mb-1 text-xs font-medium text-muted">{label}</p>}
      {payload.map((entry: any) => (
        <p key={entry.name} className="flex items-center gap-2 text-sm text-foreground">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden />
          <span>{entry.name}:</span>
          <span className="font-mono font-medium">{formatMoney(entry.value)}</span>
        </p>
      ))}
    </div>
  )
}
