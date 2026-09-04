import { useState, type FormEvent } from "react"
import { ArrowLeft, ArrowRight, CalendarClock, Check, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, ShieldCheck, UserRound, WalletCards } from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { AuthLayout } from "@/components/auth-layout"
import { Button, Input, Label } from "@/components/ui/primitives"
import { ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"

const REMEMBERED_EMAIL_KEY = "contai.remembered-email"

interface LoginLocationState {
  from?: string
  showLogin?: boolean
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as LoginLocationState | null
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? "")
  const [password, setPassword] = useState("")
  const [rememberLogin, setRememberLogin] = useState(() => Boolean(localStorage.getItem(REMEMBERED_EMAIL_KEY)))
  const [show, setShow] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [mobileStep, setMobileStep] = useState<"intro" | "login">(() =>
    locationState?.showLogin || locationState?.from ? "login" : "intro",
  )

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError("")
    setBusy(true)
    if (!email.trim() || !password) {
      setError("Informe seu e-mail e sua senha.")
      setBusy(false)
      return
    }

    try {
      await login(email, password)
      if (rememberLogin) localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim().toLowerCase())
      else localStorage.removeItem(REMEMBERED_EMAIL_KEY)
      navigate(locationState?.from ?? "/", { replace: true })
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Não foi possível entrar. Tente novamente.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Bem-vindo"
      subtitle="Entre para acessar e organizar sua vida financeira."
      titleIcon={UserRound}
      mobileIntro={mobileStep === "intro" ? <MobileIntroduction onContinue={() => setMobileStep("login")} /> : undefined}
    >
      {mobileStep === "login" && (
        <button
          type="button"
          onClick={() => setMobileStep("intro")}
          className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-lg pr-3 text-sm font-medium text-auth-muted transition-colors hover:text-auth-heading focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-auth-accent lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Voltar à apresentação
        </button>
      )}
      <form onSubmit={submit} className="space-y-5" noValidate aria-describedby={error ? "login-error" : undefined}>
        {error && (
          <div id="login-error" role="alert" className="rounded-xl border border-expense/25 bg-expense-soft/70 px-4 py-3 text-sm leading-5 text-expense">
            {error}
          </div>
        )}

        <div>
          <Label htmlFor="email" className="mb-2 text-[13px] font-medium text-auth-label">E-mail</Label>
          <div className="group relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-auth-subtle transition-colors group-focus-within:text-auth-accent" aria-hidden />
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@exemplo.com"
              aria-invalid={Boolean(error)}
              className="h-12 border-auth-border bg-auth-field pl-11 pr-4 text-auth-text shadow-none placeholder:text-auth-subtle hover:border-auth-border-strong focus:border-auth-accent/70 focus:ring-auth-accent/10"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="password" className="mb-2 text-[13px] font-medium text-auth-label">Senha</Label>
          <div className="group relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-auth-subtle transition-colors group-focus-within:text-auth-accent" aria-hidden />
            <Input
              id="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(error)}
              className="h-12 border-auth-border bg-auth-field pl-11 pr-12 text-auth-text shadow-none hover:border-auth-border-strong focus:border-auth-accent/70 focus:ring-auth-accent/10"
            />
            <button
              type="button"
              onClick={() => setShow((current) => !current)}
              aria-label={show ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={show}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-auth-subtle transition-colors hover:text-auth-label focus-visible:outline-auth-accent"
            >
              {show ? <EyeOff className="h-[18px] w-[18px]" aria-hidden /> : <Eye className="h-[18px] w-[18px]" aria-hidden />}
            </button>
          </div>
        </div>

        <label htmlFor="remember-login" className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg text-sm text-auth-muted">
          <input
            id="remember-login"
            type="checkbox"
            checked={rememberLogin}
            onChange={(event) => {
              setRememberLogin(event.target.checked)
              if (!event.target.checked) localStorage.removeItem(REMEMBERED_EMAIL_KEY)
            }}
            className="h-[18px] w-[18px] shrink-0 rounded accent-auth-accent"
          />
          <span>Lembrar meu e-mail <span className="hidden text-xs text-auth-subtle sm:inline">— sua senha não será salva</span></span>
        </label>

        <Button
          type="submit"
          variant="primary"
          className="h-12 w-full bg-auth-accent-strong text-auth-accent-foreground shadow-none hover:bg-auth-accent-hover active:translate-y-px"
          disabled={busy}
        >
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <ArrowRight className="h-4 w-4" aria-hidden />}
          {busy ? "Entrando..." : "Entrar"}
        </Button>

        <p className="pt-1 text-center text-sm text-auth-muted">
          Ainda não tem uma conta?{" "}
          <Link to="/cadastro" className="font-semibold text-auth-accent underline-offset-4 transition-colors hover:text-auth-accent-hover hover:underline focus-visible:outline-auth-accent">
            Criar conta
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}

function MobileIntroduction({ onContinue }: { onContinue: () => void }) {
  return (
    <section className="flex min-h-[calc(100dvh-5rem)] flex-col justify-between py-2" aria-labelledby="mobile-intro-title">
      <div>
        <div className="mx-auto mb-5 flex w-[60%] max-w-[240px] items-center justify-center sm:max-w-[260px]">
          <img
            src="/brand/contai-logo-576.png?v=20260903"
            alt="Contaí — Entende. Organiza. Faz crescer."
            width="576"
            height="384"
            decoding="async"
            className="block h-auto w-full object-contain mix-blend-screen"
          />
        </div>

        <h1 id="mobile-intro-title" className="text-balance text-[2.35rem] font-semibold leading-[1.04] tracking-[-0.04em] text-auth-heading">
          Saiba o que já saiu, o que vence e quanto sobra.
        </h1>
        <p className="mt-4 text-base leading-7 text-auth-muted">
          Lançamentos, contas e metas reunidos para você decidir com os números à vista.
        </p>

        <div className="mt-6 border-y border-auth-border py-2" aria-label="Recursos principais">
          <IntroBenefit icon={WalletCards} label="Saldo e movimentações no mesmo resumo" />
          <IntroBenefit icon={CalendarClock} label="Contas organizadas por vencimento" />
          <IntroBenefit icon={Check} label="Você confirma alterações do assistente" />
        </div>
      </div>

      <div className="mt-8 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <Button
          type="button"
          variant="primary"
          onClick={onContinue}
          className="h-14 w-full rounded-xl bg-auth-accent-strong text-base font-semibold text-auth-accent-foreground shadow-none hover:bg-auth-accent-hover active:translate-y-px"
        >
          Acessar minha conta
          <ArrowRight className="h-5 w-5" aria-hidden />
        </Button>
        <p className="mt-4 text-center text-xs leading-5 text-auth-subtle">Seus dados continuam protegidos e privados.</p>
      </div>
    </section>
  )
}

function IntroBenefit({ icon: Icon, label }: { icon: typeof ShieldCheck; label: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-auth-border py-3.5 text-sm text-auth-label last:border-b-0">
      <Icon className="h-[18px] w-[18px] shrink-0 text-auth-accent" aria-hidden />
      <span>{label}</span>
    </div>
  )
}
