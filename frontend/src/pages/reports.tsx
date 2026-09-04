import { useMemo, useState } from "react"
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
        <PageHeader title="Relatórios" />
        <LoadingState label="Calculando seus números..." />
      </div>
    )
  }

  if (isError) {
    return (
      <div>
        <PageHeader title="Relatórios" />
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
                className={`min-h-11 rounded-lg px-3 py-2 text-sm font-medium transition-[color,background-color,box-shadow] ${
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
            <p className="text-sm text-muted">Saldo líquido do período</p>
            <p className={`metric-value-lg mt-1 ${totals.net >= 0 ? "text-income" : "text-expense"}`}>
              {formatMoney(totals.net)}
            </p>
          </div>
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
        <Card className="p-5">
          <h2 className="font-sans text-base font-semibold text-foreground">Entradas x Saídas</h2>
          <p className="mb-4 text-sm text-muted">Comparativo mensal dos últimos {range} meses.</p>
          <MonthlyBars data={monthly} />
          <table className="sr-only">
            <caption>Entradas e saídas mensais dos últimos {range} meses</caption>
            <thead><tr><th scope="col">Mês</th><th scope="col">Entradas</th><th scope="col">Saídas</th></tr></thead>
            <tbody>
              {monthly.map((item) => <tr key={item.month}><th scope="row">{item.label}</th><td>{formatMoney(item.income)}</td><td>{formatMoney(item.expense)}</td></tr>)}
            </tbody>
          </table>
        </Card>

        <Card className="p-5">
          <h2 className="font-sans text-base font-semibold text-foreground">Evolução do saldo</h2>
          <p className="mb-4 text-sm text-muted">Saldo acumulado ao longo do período.</p>
          <BalanceTrend data={trend} />
          <table className="sr-only">
            <caption>Evolução mensal do saldo acumulado</caption>
            <thead><tr><th scope="col">Mês</th><th scope="col">Saldo acumulado</th></tr></thead>
            <tbody>
              {trend.map((item) => <tr key={item.label}><th scope="row">{item.label}</th><td>{formatMoney(item.balance)}</td></tr>)}
            </tbody>
          </table>
        </Card>

        <Card className="p-5 lg:col-span-2">
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
              <CategoryDonut data={categories} total={totals.expense} />
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

type MonthlyPoint = { month: string; label: string; income: number; expense: number }
type TrendPoint = { label: string; balance: number }
type CategoryPoint = { category: string; label: string; value: number }

function MonthlyBars({ data }: { data: MonthlyPoint[] }) {
  const maximum = Math.max(1, ...data.flatMap((item) => [item.income, item.expense]))

  return (
    <div className="h-56 sm:h-72" role="img" aria-label="Gráfico comparando entradas e saídas mensais">
      <div className="mb-3 flex justify-end gap-4 text-xs text-muted" aria-hidden>
        <ChartKey color="bg-income" label="Entradas" />
        <ChartKey color="bg-expense" label="Saídas" />
      </div>
      <div className="relative flex h-[calc(100%-2rem)] items-end gap-2 border-b border-border px-1" aria-hidden>
        <div className="pointer-events-none absolute inset-x-0 top-0 grid h-full grid-rows-4">
          {[0, 1, 2, 3].map((line) => <span key={line} className="border-t border-dashed border-border" />)}
        </div>
        {data.map((item) => (
          <div key={item.month} className="relative flex h-full min-w-0 flex-1 flex-col justify-end">
            <div className="flex min-h-0 flex-1 items-end justify-center gap-1 px-0.5">
              <span className="w-full max-w-5 rounded-t bg-income" style={{ height: item.income > 0 ? `${Math.max(2, (item.income / maximum) * 100)}%` : 0 }} />
              <span className="w-full max-w-5 rounded-t bg-expense" style={{ height: item.expense > 0 ? `${Math.max(2, (item.expense / maximum) * 100)}%` : 0 }} />
            </div>
            <span className="mt-2 truncate text-center text-[10px] text-muted sm:text-xs">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChartKey({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm ${color}`} />{label}</span>
}

function BalanceTrend({ data }: { data: TrendPoint[] }) {
  const width = 640
  const height = 240
  const padding = 18
  const values = data.map((item) => item.balance)
  const minimum = Math.min(0, ...values)
  const maximum = Math.max(0, ...values)
  const span = Math.max(1, maximum - minimum)
  const points = data.map((item, index) => ({
    ...item,
    x: data.length === 1 ? width / 2 : padding + (index / Math.max(1, data.length - 1)) * (width - padding * 2),
    y: padding + ((maximum - item.balance) / span) * (height - padding * 2 - 26),
  }))

  return (
    <div className="h-56 sm:h-72" role="img" aria-label="Gráfico da evolução do saldo acumulado">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" aria-hidden preserveAspectRatio="xMidYMid meet">
        {[0, 1, 2, 3].map((line) => {
          const y = padding + line * ((height - padding * 2 - 26) / 3)
          return <line key={line} x1={padding} y1={y} x2={width - padding} y2={y} stroke="var(--color-border)" strokeDasharray="5 5" />
        })}
        {points.length > 1 && <polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke="var(--color-primary)" strokeWidth="3" vectorEffect="non-scaling-stroke" />}
        {points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="4" fill="var(--color-primary)"><title>{`${point.label}: ${formatMoney(point.balance)}`}</title></circle>
            <text x={point.x} y={height - 5} textAnchor="middle" fill="var(--color-muted)" fontSize="12">{point.label}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function CategoryDonut({ data, total }: { data: CategoryPoint[]; total: number }) {
  let offset = 0
  const stops = data.map((item, index) => {
    const start = offset
    offset += total > 0 ? (item.value / total) * 100 : 0
    return `${PIE_COLORS[index % PIE_COLORS.length]} ${start}% ${offset}%`
  })

  return (
    <div className="flex h-56 items-center justify-center sm:h-72" role="img" aria-label="Gráfico da distribuição de gastos por categoria">
      <div className="relative aspect-square h-44 rounded-full sm:h-52" style={{ background: `conic-gradient(${stops.join(", ")})` }} aria-hidden>
        <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-surface text-center shadow-inner">
          <span className="text-xs text-muted">Total</span>
          <span className="mt-1 max-w-28 truncate font-mono text-sm font-semibold text-foreground">{formatMoney(total)}</span>
        </div>
      </div>
    </div>
  )
}
