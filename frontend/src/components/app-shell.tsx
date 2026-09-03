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
  MoreHorizontal,
  X,
  LogOut,
  UserRound,
  ShieldCheck,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth"
import { BrandLogo } from "@/components/brand-logo"

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
  { to: "/conta-e-privacidade", label: "Conta e privacidade", icon: ShieldCheck },
]

const MOBILE_NAV_PATHS = new Set(["/", "/calendario", "/lancamentos", "/assistente"])
const MOBILE_NAV = NAV.filter((item) => MOBILE_NAV_PATHS.has(item.to))

export function AppShell() {
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const { user, logout } = useAuth()
  async function handleLogout() {
    setLoggingOut(true)
    try { await logout() } finally { setLoggingOut(false) }
  }
  const active = NAV.find((n) =>
    n.end ? location.pathname === n.to : location.pathname.startsWith(n.to),
  )
  const firstName = user?.name.trim().split(/\s+/)[0] || "Usuário"
  const userInitial = firstName.charAt(0).toLocaleUpperCase("pt-BR")
  const ActiveIcon = active?.icon

  return (
    <div className="min-h-dvh bg-transparent">
      {/* Desktop sidebar */}
      <aside className="app-sidebar fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-surface px-4 py-5 lg:flex">
        <div className="px-2 py-1">
          <BrandLogo className="justify-center" imageClassName="w-32" />
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
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:bg-surface-2 hover:text-foreground",
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
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-3 text-muted"><UserRound className="h-4 w-4" aria-hidden /></div>
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-foreground">{user?.name}</p><p className="truncate text-[11px] text-subtle">{user?.email}</p></div>
          <button type="button" onClick={handleLogout} disabled={loggingOut} aria-label="Sair da conta" title="Sair" className="flex h-9 w-9 items-center justify-center rounded-xl text-muted hover:bg-expense-soft hover:text-expense disabled:opacity-50"><LogOut className="h-4 w-4" aria-hidden /></button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="app-sidebar sticky top-0 z-20 flex items-center justify-between border-b border-border bg-surface/95 px-4 py-3 shadow-sm backdrop-blur-xl lg:hidden">
        <div className="flex min-w-0 items-center gap-2.5" aria-label={`Usuário conectado: ${firstName}`}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-primary text-sm font-bold text-primary-foreground shadow-[0_10px_28px_-12px_var(--color-primary)]" aria-hidden>
            {userInitial}
          </div>
          <div className="min-w-0 leading-tight">
            <p className="text-[11px] text-subtle">Olá,</p>
            <p className="max-w-32 truncate text-sm font-semibold text-foreground">{firstName}</p>
          </div>
        </div>
        <div className="ml-3 flex min-w-0 items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-muted" aria-label={`Página atual: ${active?.label ?? "Página"}`}>
          {ActiveIcon && <ActiveIcon className="h-4 w-4 shrink-0" aria-hidden />}
          <span className="max-w-28 truncate text-xs font-medium sm:max-w-40">{active?.label}</span>
        </div>
      </header>

      {/* Content */}
      <main className="lg:pl-64">
        <div
          className={cn(
            "mx-auto w-full px-4 sm:px-6 xl:px-8",
            location.pathname.startsWith("/assistente")
              ? "h-[calc(100dvh-4.0625rem)] max-w-5xl overflow-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-4 sm:pt-6 lg:h-dvh lg:pb-8 lg:pt-8"
              : cn(
                  "pb-24 pt-5 sm:pb-28 sm:pt-7 lg:pb-12 lg:pt-9",
                  location.pathname.startsWith("/calendario")
                    ? "max-w-7xl"
                    : "max-w-5xl",
                ),
          )}
        >
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 shadow-[0_-12px_30px_-24px_rgba(0,0,0,0.7)] backdrop-blur-xl lg:hidden"
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
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
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
              <button type="button" onClick={handleLogout} disabled={loggingOut} className="flex min-h-12 items-center gap-3 rounded-2xl border border-expense/25 bg-expense-soft p-3 text-sm font-medium text-expense disabled:opacity-50"><LogOut className="h-5 w-5" aria-hidden /> Sair</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
