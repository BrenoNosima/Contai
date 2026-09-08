import { useEffect, useState } from "react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  CalendarDays,
  ArrowLeftRight,
  Target,
  BarChart3,
  Repeat,
  MessageCircle,
  MoreHorizontal,
  LogOut,
  UserRound,
  ShieldCheck,
  CircleHelp,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth"
import { BrandLogo } from "@/components/brand-logo"
import { Dialog } from "@/components/ui/dialog"
import { DEMO_MODE } from "@/lib/demo-api"

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
  { to: "/assistente", label: "Assistente", icon: MessageCircle },
  { to: "/ajuda", label: "Ajuda", icon: CircleHelp },
  { to: "/conta-e-privacidade", label: "Conta e privacidade", icon: ShieldCheck },
]

const MOBILE_NAV_PATHS = new Set(["/", "/lancamentos", "/assistente"])
const MOBILE_NAV = NAV.filter((item) => MOBILE_NAV_PATHS.has(item.to))
const DESKTOP_GROUPS = [
  { label: "Dia a dia", items: NAV.slice(0, 3) },
  { label: "Planejamento", items: NAV.slice(3, 6) },
  { label: "Ferramentas", items: NAV.slice(6, 8) },
]

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
  const moreActive = Boolean(active && !MOBILE_NAV_PATHS.has(active.to))
  const activeMobileIndex = MOBILE_NAV.findIndex((item) => item.to === active?.to)
  const desiredGlowIndex = moreOpen || moreActive ? 3 : Math.max(activeMobileIndex, 0)
  const [glowIndex, setGlowIndex] = useState(desiredGlowIndex)
  const [glowVisible, setGlowVisible] = useState(true)

  useEffect(() => {
    if (desiredGlowIndex === glowIndex) {
      setGlowVisible(true)
      return
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setGlowIndex(desiredGlowIndex)
      setGlowVisible(true)
      return
    }

    setGlowVisible(false)
    const moveTimer = window.setTimeout(() => {
      setGlowIndex(desiredGlowIndex)
      window.requestAnimationFrame(() => setGlowVisible(true))
    }, 120)
    return () => window.clearTimeout(moveTimer)
  }, [desiredGlowIndex, glowIndex])
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
        <nav className="mt-7 flex flex-1 flex-col gap-5" aria-label="Navegação principal">
          {DESKTOP_GROUPS.map((group) => <div key={group.label}>
            <p className="mb-1 px-3 text-[11px] font-medium text-subtle">{group.label}</p>
            <div className="space-y-1">{group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200",
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
            ))}</div>
          </div>)}
        </nav>
        <NavLink to="/conta-e-privacidade" className={({ isActive }) => cn("mb-2 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium", isActive ? "bg-primary/10 text-primary" : "text-muted hover:bg-surface-2 hover:text-foreground")}>
          <ShieldCheck className="h-[18px] w-[18px]" aria-hidden /> Conta e privacidade
        </NavLink>
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-3 text-muted"><UserRound className="h-4 w-4" aria-hidden /></div>
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-foreground">{user?.name}</p><p className="truncate text-[11px] text-subtle">{user?.email}</p></div>
          <button type="button" onClick={handleLogout} disabled={loggingOut} aria-label="Sair da conta" title="Sair" className="flex h-11 w-11 items-center justify-center rounded-xl text-muted hover:bg-expense-soft hover:text-expense disabled:opacity-50"><LogOut className="h-4 w-4" aria-hidden /></button>
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
        {DEMO_MODE && <div className="border-b border-warning/30 bg-warning-soft px-4 py-2 text-center text-xs font-medium text-warning">Modo demonstração · dados fictícios · alterações reiniciam ao recarregar</div>}
        <div
          className={cn(
            "mx-auto w-full px-4 sm:px-6 xl:px-8",
            location.pathname.startsWith("/assistente")
              ? "h-[calc(100dvh-4.0625rem)] max-w-5xl overflow-hidden pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 sm:pt-6 lg:h-dvh lg:pb-8 lg:pt-8"
              : cn(
                  "pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 sm:pt-7 lg:pb-12 lg:pt-9",
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
        className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-3 right-3 z-30 mx-auto max-w-[30rem] rounded-[26px] border border-border bg-surface shadow-[0_12px_36px_-14px_rgba(0,0,0,0.85)] lg:hidden"
        aria-label="Navegação inferior"
      >
        <div className="relative flex items-stretch p-1.5">
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute left-1.5 top-1.5 h-12 w-[calc((100%-0.75rem)/4)] transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none",
              glowVisible ? "opacity-100" : "opacity-0",
            )}
            style={{ transform: `translateX(${glowIndex * 100}%)` }}
          >
            <span className="absolute left-1/2 top-[-0.375rem] h-11 w-16 -translate-x-1/2 [clip-path:polygon(32%_0%,68%_0%,100%_100%,0%_100%)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-primary)_38%,transparent)_0%,color-mix(in_srgb,var(--color-primary)_18%,transparent)_38%,color-mix(in_srgb,var(--color-primary)_6%,transparent)_70%,transparent_100%)] blur-[5px]" />
            <span className="absolute left-1/2 top-[-0.375rem] h-0.5 w-6 -translate-x-1/2 rounded-full bg-foreground/90 shadow-[0_0_7px_color-mix(in_srgb,var(--color-primary)_55%,transparent)]" />
          </span>
          {MOBILE_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] px-0.5 py-1.5 text-[10px] font-medium transition-[color,background-color,opacity,transform] duration-200 [&>span]:relative [&>span]:z-10 [&>svg]:relative [&>svg]:z-10 focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98]",
                  isActive ? "text-primary" : "text-subtle hover:bg-surface-2 hover:text-foreground",
                )
              }
            >
              <item.icon className="h-5 w-5" aria-hidden />
              <span className="max-w-full truncate">{item.label}</span>
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] px-0.5 py-1.5 text-[10px] font-medium transition-[color,background-color,opacity,transform] duration-200 [&>span]:relative [&>span]:z-10 [&>svg]:relative [&>svg]:z-10 focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98]",
              moreActive || moreOpen ? "text-primary" : "text-subtle hover:bg-surface-2 hover:text-foreground",
            )}
            aria-expanded={moreOpen}
            aria-current={moreActive ? "page" : undefined}
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden />
            <span>Mais</span>
          </button>
        </div>
      </nav>

      <Dialog
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="Mais opções"
        description="Planejamento e configurações."
        className="lg:hidden"
      >
        <div className="divide-y divide-border border-y border-border">
          {NAV.filter((item) => !MOBILE_NAV.includes(item)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMoreOpen(false)}
              className={({ isActive }) => cn(
                "flex min-h-12 items-center gap-3 px-1 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-5 w-5" aria-hidden />
              {item.label}
            </NavLink>
          ))}
          <button type="button" onClick={handleLogout} disabled={loggingOut} className="flex min-h-12 w-full items-center gap-3 px-1 py-3 text-sm font-medium text-expense disabled:opacity-50"><LogOut className="h-5 w-5" aria-hidden /> Sair</button>
        </div>
      </Dialog>
    </div>
  )
}
