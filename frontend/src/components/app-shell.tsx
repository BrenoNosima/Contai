import { useState } from "react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  CalendarDays,
  ArrowLeftRight,
  Target,
  BarChart3,
  Repeat,
  Sparkles,
  Plus,
  MoreHorizontal,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const NAV: NavItem[] = [
  { to: "/", label: "Visão geral", icon: LayoutDashboard, end: true },
  { to: "/calendario", label: "Calendário", icon: CalendarDays },
  { to: "/lancamentos", label: "Lançamentos", icon: ArrowLeftRight },
  { to: "/metas", label: "Metas", icon: Target },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/gastos-fixos", label: "Gastos fixos", icon: Repeat },
  { to: "/assistente", label: "Assistente", icon: Sparkles },
]

const MOBILE_NAV_PATHS = new Set(["/", "/calendario", "/lancamentos", "/assistente"])
const MOBILE_NAV = NAV.filter((item) => MOBILE_NAV_PATHS.has(item.to))

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-[14px] bg-primary text-primary-foreground shadow-[0_10px_28px_-12px_var(--color-primary)]">
        <span className="tnum text-lg font-bold">B</span>
        <span className="absolute inset-x-1 top-0 h-px bg-white/40" aria-hidden />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold tracking-tight text-foreground">Breno Finance</p>
        <p className="text-[11px] text-subtle">controle financeiro</p>
      </div>
    </div>
  )
}

export function AppShell() {
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const active = NAV.find((n) =>
    n.end ? location.pathname === n.to : location.pathname.startsWith(n.to),
  )

  return (
    <div className="min-h-dvh bg-transparent">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border/80 bg-surface/80 px-4 py-5 backdrop-blur-xl lg:flex">
        <div className="px-2 py-1">
          <Logo />
        </div>
        <div className="mt-7 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
          Menu principal
        </div>
        <nav className="mt-2 flex flex-1 flex-col gap-1" aria-label="Navegação principal">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-foreground shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]"
                    : "text-muted hover:translate-x-0.5 hover:bg-surface-2/80 hover:text-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" />
                  )}
                  <item.icon
                    className={cn("h-[18px] w-[18px] transition-colors", isActive && "text-primary")}
                    aria-hidden
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <NavLink
          to="/lancamentos"
          className="mb-3 flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_12px_28px_-16px_var(--color-primary)] transition-all hover:-translate-y-0.5 hover:brightness-105"
        >
          <Plus className="h-4 w-4" aria-hidden /> Novo lançamento
        </NavLink>
        <div className="rounded-xl border border-border/80 bg-surface-2/60 p-3 text-xs leading-relaxed text-muted">
          Atualize os status das contas para manter seu saldo e relatórios em dia.
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Logo />
        <span className="text-sm font-medium text-muted">{active?.label}</span>
      </header>

      {/* Content */}
      <main className="lg:pl-64">
        <div
          className={cn(
            "mx-auto w-full px-4 pb-28 pt-6 sm:px-6 lg:pb-12 lg:pt-9 xl:px-8",
            location.pathname.startsWith("/calendario")
              ? "max-w-7xl"
              : "max-w-5xl",
          )}
        >
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-surface/90 shadow-[0_-16px_40px_-28px_rgba(0,0,0,0.9)] backdrop-blur-xl lg:hidden"
        aria-label="Navegação inferior"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {MOBILE_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "relative flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-subtle hover:text-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />}
                  <item.icon className="h-5 w-5" aria-hidden />
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium text-subtle transition-colors hover:text-foreground"
            aria-expanded={moreOpen}
            aria-controls="mobile-more-menu"
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden />
            <span>Mais</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" id="mobile-more-menu">
          <button
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
            aria-label="Fechar menu"
          />
          <div className="animate-dialog-in absolute inset-x-3 bottom-20 rounded-3xl border border-border bg-surface p-3 shadow-2xl">
            <div className="flex items-center justify-between px-2 pb-2 pt-1">
              <p className="text-sm font-semibold text-foreground">Mais opções</p>
              <button
                onClick={() => setMoreOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {NAV.filter((item) => !MOBILE_NAV.includes(item)).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 rounded-2xl border p-3 text-sm font-medium transition-colors",
                    isActive
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-surface-2 text-muted hover:text-foreground",
                  )}
                >
                  <item.icon className="h-5 w-5" aria-hidden />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
