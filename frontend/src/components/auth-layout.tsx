import type { ReactNode } from "react"
import { ShieldCheck, Sparkles, WalletCards } from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"

export function AuthLayout({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  return <main className="grid min-h-dvh bg-background lg:grid-cols-[1.05fr_0.95fr]">
    <section className="relative hidden overflow-hidden border-r border-border bg-surface lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
      <div className="absolute -left-32 top-20 h-80 w-80 rounded-full bg-income/10 blur-3xl" aria-hidden />
      <BrandLogo className="relative" imageClassName="w-48" />
      <div className="relative max-w-xl">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-income">Clareza para decidir melhor</p>
        <h1 className="text-balance text-4xl font-semibold leading-tight tracking-[-0.04em] text-foreground xl:text-5xl">Sua vida financeira, organizada em um só lugar.</h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-muted">Acompanhe lançamentos, metas e vencimentos com uma visão simples, privada e feita para a sua rotina.</p>
      </div>
      <div className="relative grid grid-cols-3 gap-3 text-xs text-muted">
        <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-income" aria-hidden /> Sessão segura</span>
        <span className="flex items-center gap-2"><WalletCards className="h-4 w-4 text-income" aria-hidden /> Dados privados</span>
        <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-income" aria-hidden /> Assistente integrado</span>
      </div>
    </section>
    <section className="flex min-h-dvh items-center justify-center px-4 py-10 sm:px-8">
      <div className="w-full max-w-md">
        <BrandLogo className="mb-8 lg:hidden" imageClassName="w-36" />
        <div className="mb-7"><h1 className="text-3xl font-semibold tracking-[-0.035em] text-foreground">{title}</h1><p className="mt-2 leading-6 text-muted">{subtitle}</p></div>
        {children}
      </div>
    </section>
  </main>
}
