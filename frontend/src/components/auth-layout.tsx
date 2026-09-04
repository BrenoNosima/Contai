import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import type { LucideIcon } from "lucide-react"
import { CalendarClock, Check, WalletCards } from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle: string
  titleIcon?: LucideIcon
  mobileIntro?: ReactNode
}

export function AuthLayout({ children, title, subtitle, titleIcon: TitleIcon, mobileIntro }: AuthLayoutProps) {
  return (
    <main className="relative grid min-h-dvh overflow-x-hidden bg-auth-canvas lg:grid-cols-[minmax(0,1.08fr)_minmax(430px,0.92fr)]">
      <section className="relative hidden min-h-dvh overflow-hidden border-r border-auth-border bg-auth-canvas lg:flex lg:flex-col lg:justify-between lg:px-10 lg:py-9 xl:px-16 xl:py-12 2xl:px-20">
        <BrandLogo
          className="auth-brand-logo relative z-10 shrink-0 justify-center self-center"
          imageClassName="w-60 mix-blend-screen xl:w-64 2xl:w-72"
        />

        <div className="relative z-10 max-w-[640px] pb-8 xl:pb-12">
          <h1 className="max-w-[620px] text-balance text-[clamp(2.5rem,4.5vw,4.75rem)] font-semibold leading-[1.03] tracking-[-0.04em] text-auth-heading">
            Saiba o que já saiu, o que vence e quanto sobra.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-auth-muted xl:text-lg xl:leading-8">
            A Contaí reúne seus lançamentos, contas e metas para você decidir com os números à vista.
          </p>
          <div className="mt-8 max-w-lg border-y border-auth-border py-2">
            <ProductPoint icon={WalletCards} text="Saldo e movimentações no mesmo resumo" />
            <ProductPoint icon={CalendarClock} text="Contas pendentes organizadas por vencimento" />
            <ProductPoint icon={Check} text="Toda alteração pelo assistente pede confirmação" />
          </div>
        </div>

      </section>

      <section className="relative flex min-h-dvh items-start justify-center bg-auth-panel px-5 py-6 sm:px-10 sm:py-10 lg:items-center lg:px-10 xl:px-16">
        <div className="relative w-full max-w-[440px] animate-in">
          {mobileIntro && <div className="lg:hidden">{mobileIntro}</div>}

          <div className={mobileIntro ? "hidden lg:block" : undefined}>
            <BrandLogo
              className="auth-brand-logo mb-8 justify-center lg:hidden"
              imageClassName="w-36 mix-blend-screen sm:w-40"
            />

            <div className="mb-8 flex items-start gap-4">
              {TitleIcon && (
                <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-auth-accent/20 bg-income-soft text-auth-accent shadow-[0_10px_28px_-18px_var(--color-auth-accent)]" aria-hidden>
                  <TitleIcon className="h-5 w-5" />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-semibold tracking-[-0.04em] text-auth-heading sm:text-[2rem]">{title}</h1>
                <p className="mt-2 max-w-sm text-sm leading-6 text-auth-muted">{subtitle}</p>
              </div>
            </div>
            {children}
            <p className="mt-7 text-center text-xs text-auth-subtle">
              <Link to="/privacidade" className="min-h-11 rounded-lg px-2 py-3 underline underline-offset-4 hover:text-auth-label">Política de Privacidade</Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

function ProductPoint({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-auth-border py-3.5 last:border-b-0">
      <Icon className="h-5 w-5 text-auth-accent" aria-hidden />
      <span className="text-sm text-auth-label xl:text-base">{text}</span>
    </div>
  )
}
