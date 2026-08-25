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
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react"
import { qk } from "@/lib/query"
import { reportsApi } from "@/lib/api"
import { PageHeader } from "@/components/page-header"
import { Card } from "@/components/ui/primitives"
import { ErrorState, LoadingState } from "@/components/ui/states"
import { formatMoney } from "@/lib/utils"
import { categoryMeta } from "@/lib/categories"

const RANGE_OPTIONS = [
  { value: 3, label: "3 meses" },
  { value: 6, label: "6 meses" },
  { value: 12, label: "12 meses" },
]

const PIE_COLORS = [
  "var(--color-category-1)",
  "var(--color-category-2)",
  "var(--color-category-3)",
  "var(--color-category-4)",
  "var(--color-category-5)",
  "var(--color-category-6)",
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
    const categoryItems = (data?.categories ?? [])
      .map((item) => ({
        category: item.category,
        value: item.amount,
        label: categoryMeta(item.category).label,
      }))
      .sort((a, b) => b.value - a.value)
    const mainCategories = categoryItems.slice(0, 5)
    const otherValue = categoryItems
      .slice(5)
      .reduce((sum, item) => sum + item.value, 0)
    const categories = otherValue > 0
      ? [...mainCategories, { category: "other", value: otherValue, label: "Outros" }]
      : mainCategories
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
                aria-pressed={range === opt.value}
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

      <Card className="overflow-hidden p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-subtle">
              Resultado do período
            </p>
            <p className="mt-2 text-sm text-muted">Saldo líquido</p>
            <p className={`metric-value-lg mt-1 ${totals.net >= 0 ? "text-income" : "text-expense"}`}>
              {formatMoney(totals.net)}
            </p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-foreground">
            <Wallet className="h-5 w-5" aria-hidden />
          </span>
        </div>
        <div className="mt-5 grid grid-cols-2 divide-x divide-border border-t border-border pt-4">
          <PeriodMetric
            label="Entradas"
            value={totals.income}
            tone="income"
            icon={ArrowDownLeft}
          />
          <PeriodMetric
            label="Saídas"
            value={totals.expense}
            tone="expense"
            icon={ArrowUpRight}
            className="pl-4 sm:pl-5"
          />
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5 transition-colors hover:border-border-strong">
          <h2 className="font-sans text-base font-semibold text-foreground">Entradas x Saídas</h2>
          <p className="mb-4 text-sm text-muted">Comparativo mensal dos últimos {range} meses.</p>
          <div className="h-56 sm:h-72" role="img" aria-label="Gráfico comparando entradas e saídas mensais">
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
          <div className="h-56 sm:h-72" role="img" aria-label="Gráfico da evolução do saldo acumulado">
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
              <div className="h-56 sm:h-72" role="img" aria-label="Gráfico da distribuição de gastos por categoria">
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
                  return (
                    <li key={c.category} className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                        aria-hidden
                      />
                      <span className="flex-1 text-sm text-foreground">{c.label}</span>
                      <span className="font-mono text-sm text-muted">{pct.toFixed(0)}%</span>
                      <span className="min-w-0 text-right font-mono text-xs text-foreground min-[380px]:w-24 min-[380px]:text-sm">
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

function PeriodMetric({
  label,
  value,
  tone,
  icon: Icon,
  className = "",
}: {
  label: string
  value: number
  tone: "income" | "expense"
  icon: typeof Wallet
  className?: string
}) {
  return (
    <div className={`min-w-0 pr-4 sm:pr-5 ${className}`}>
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <Icon className={`h-3.5 w-3.5 ${tone === "income" ? "text-income" : "text-expense"}`} aria-hidden />
        <span>{label}</span>
      </div>
      <p className={`mt-1.5 font-mono text-sm font-semibold min-[380px]:text-base ${tone === "income" ? "text-income" : "text-expense"}`}>
        {formatMoney(value)}
      </p>
    </div>
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
