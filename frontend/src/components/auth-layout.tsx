import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { BarChart3, ShieldCheck, Sparkles, TrendingUp, WalletCards } from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle: string
  titleIcon?: LucideIcon
}

export function AuthLayout({ children, title, subtitle, titleIcon: TitleIcon }: AuthLayoutProps) {
  return (
    <main className="relative grid min-h-dvh overflow-hidden bg-[#050809] lg:grid-cols-[minmax(0,1.08fr)_minmax(430px,0.92fr)]">
      <section className="relative hidden min-h-dvh overflow-hidden border-r border-white/[0.07] bg-[#05090a] lg:flex lg:flex-col lg:justify-between lg:px-10 lg:py-9 xl:px-16 xl:py-12 2xl:px-20">
        <FinancialBackdrop />

        <BrandLogo className="auth-brand-logo relative z-10 shrink-0" imageClassName="w-44 mix-blend-screen xl:w-48" />

        <div className="relative z-10 max-w-[640px] pb-8 xl:pb-12">
          <div className="mb-6 flex items-center gap-3">
            <span className="h-px w-8 bg-gradient-to-r from-[#17c9a0] to-[#86e34f]" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53dcb5]">Clareza para decidir melhor</p>
          </div>
          <h1 className="max-w-[620px] text-balance text-[clamp(2.5rem,4.5vw,4.75rem)] font-semibold leading-[1.03] tracking-[-0.055em] text-[#f4faf7]">
            Sua vida financeira, <span className="text-[#72df68]">organizada</span> em um só lugar.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-[#9baaa5] xl:text-lg xl:leading-8">
            Controle lançamentos, metas e vencimentos com uma visão simples, privada e preparada para a sua rotina.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-3 border-t border-white/[0.07] pt-6 text-xs text-[#a8b7b2]">
          <Benefit icon={ShieldCheck} label="Sessão segura" />
          <Benefit icon={WalletCards} label="Dados privados" />
          <Benefit icon={Sparkles} label="Assistente integrado" />
        </div>
      </section>

      <section className="relative flex min-h-dvh items-center justify-center bg-[#0b1011] px-5 py-10 sm:px-10 lg:px-10 xl:px-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,rgba(41,207,157,0.06),transparent_70%)]" aria-hidden />
        <div className="relative w-full max-w-[440px] animate-in">
          <BrandLogo className="auth-brand-logo mb-8 lg:hidden" imageClassName="w-28 mix-blend-screen sm:w-32" />

          <div className="mb-8 flex items-start gap-4">
            {TitleIcon && (
              <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#3ad3a7]/20 bg-[#113128] text-[#50d9b2] shadow-[0_0_28px_-18px_rgba(52,211,153,0.7)]" aria-hidden>
                <TitleIcon className="h-5 w-5" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#f4faf7] sm:text-[2rem]">{title}</h1>
              <p className="mt-2 max-w-sm text-sm leading-6 text-[#91a09b]">{subtitle}</p>
            </div>
          </div>
          {children}
        </div>
      </section>
    </main>
  )
}

function Benefit({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="flex items-center gap-2.5 leading-5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#39d0a4]/15 bg-[#0e241e] text-[#4bd8b0]">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      {label}
    </span>
  )
}

function FinancialBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="absolute -left-32 top-[22%] h-96 w-96 rounded-full bg-[#00c99a]/[0.055] blur-3xl" />
      <div className="absolute -right-24 bottom-[18%] h-80 w-80 rounded-full bg-[#84e44f]/[0.04] blur-3xl" />
      <TrendingUp className="absolute right-[9%] top-[20%] h-28 w-28 rotate-[-5deg] text-[#4bd8b0] opacity-[0.055] xl:h-36 xl:w-36" strokeWidth={1} />
      <BarChart3 className="absolute bottom-[27%] right-[15%] h-20 w-20 text-white opacity-[0.035] xl:h-24 xl:w-24" strokeWidth={1} />
      <div className="absolute right-[7%] top-[47%] flex items-end gap-2 opacity-[0.055]">
        <span className="h-8 w-3 rounded-sm bg-[#22c99d]" />
        <span className="h-14 w-3 rounded-sm bg-[#45d990]" />
        <span className="h-24 w-3 rounded-sm bg-[#78e45e]" />
        <span className="h-32 w-3 rounded-sm bg-[#92e948]" />
      </div>
    </div>
  )
}
