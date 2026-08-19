import { NavLink, Outlet, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  CalendarDays,
  ArrowLeftRight,
  Target,
  BarChart3,
  Repeat,
  Sparkles,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  primaryMobile?: boolean // shows in the bottom bar (max 5)
}

const NAV: NavItem[] = [
  { to: "/", label: "Visão geral", icon: LayoutDashboard, end: true, primaryMobile: true },
  { to: "/calendario", label: "Calendário", icon: CalendarDays, primaryMobile: true },
  { to: "/lancamentos", label: "Lançamentos", icon: ArrowLeftRight, primaryMobile: true },
  { to: "/metas", label: "Metas", icon: Target, primaryMobile: true },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/gastos-fixos", label: "Gastos fixos", icon: Repeat },
  { to: "/assistente", label: "Assistente", icon: Sparkles, primaryMobile: true },
]

const MOBILE_NAV = NAV.filter((n) => n.primaryMobile).slice(0, 5)

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <span className="tnum text-lg font-bold">B</span>
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-foreground">Breno Finance</p>
        <p className="text-[11px] text-subtle">agenda financeira</p>
      </div>
    </div>
  )
}

export function AppShell() {
  const location = useLocation()
  const active = NAV.find((n) =>
    n.end ? location.pathname === n.to : location.pathname.startsWith(n.to),
  )

  return (
    <div className="min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-surface px-4 py-6 lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Navegação principal">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-surface-3 text-foreground"
                    : "text-muted hover:bg-surface-2 hover:text-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn("h-5 w-5", isActive && "text-primary")}
                    aria-hidden
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="rounded-xl border border-border bg-surface-2 p-3 text-xs text-muted">
          Seus dados vivem no backend. Marque contas como pagas e tudo se
          sincroniza sozinho.
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <span className="text-sm font-medium text-muted">{active?.label}</span>
      </header>

      {/* Content */}
      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:px-6 lg:pb-10 lg:pt-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur lg:hidden"
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
                  "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-subtle hover:text-foreground",
                )
              }
            >
              <item.icon className="h-5 w-5" aria-hidden />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
