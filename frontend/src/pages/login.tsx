import { useState, type FormEvent } from "react"
import { ArrowLeft, ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, ShieldCheck, Sparkles, UserRound, WalletCards } from "lucide-react"
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
          className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-lg pr-3 text-sm font-medium text-[#9ba9a4] transition-colors hover:text-[#e7f4ef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#53dcb5] lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Voltar à apresentação
        </button>
      )}
      <form onSubmit={submit} className="space-y-5" noValidate aria-describedby={error ? "login-error" : undefined}>
        {error && (
          <div id="login-error" role="alert" className="rounded-xl border border-[#f07a83]/25 bg-[#3c2228]/70 px-4 py-3 text-sm leading-5 text-[#ff9ca4]">
            {error}
          </div>
        )}

        <div>
          <Label htmlFor="email" className="mb-2 text-[13px] font-medium text-[#c0ccc8]">E-mail</Label>
          <div className="group relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-[#71817b] transition-colors group-focus-within:text-[#43d6ad]" aria-hidden />
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
              className="h-12 border-white/[0.09] bg-[#101617] pl-11 pr-4 text-[#edf6f2] shadow-none placeholder:text-[#66746f] hover:border-white/[0.15] focus:border-[#3bd3a7]/70 focus:ring-[#31cda1]/10"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="password" className="mb-2 text-[13px] font-medium text-[#c0ccc8]">Senha</Label>
          <div className="group relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-[#71817b] transition-colors group-focus-within:text-[#43d6ad]" aria-hidden />
            <Input
              id="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(error)}
              className="h-12 border-white/[0.09] bg-[#101617] pl-11 pr-12 text-[#edf6f2] shadow-none hover:border-white/[0.15] focus:border-[#3bd3a7]/70 focus:ring-[#31cda1]/10"
            />
            <button
              type="button"
              onClick={() => setShow((current) => !current)}
              aria-label={show ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={show}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-[#71817b] transition-colors hover:text-[#d7e4df] focus-visible:outline-[#48d9b0]"
            >
              {show ? <EyeOff className="h-[18px] w-[18px]" aria-hidden /> : <Eye className="h-[18px] w-[18px]" aria-hidden />}
            </button>
          </div>
        </div>

        <label htmlFor="remember-login" className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg text-sm text-[#9ba9a4]">
          <input
            id="remember-login"
            type="checkbox"
            checked={rememberLogin}
            onChange={(event) => {
              setRememberLogin(event.target.checked)
              if (!event.target.checked) localStorage.removeItem(REMEMBERED_EMAIL_KEY)
            }}
            className="h-[18px] w-[18px] shrink-0 rounded accent-[#42d6aa]"
          />
          <span>Lembrar meu e-mail <span className="hidden text-xs text-[#687873] sm:inline">— sua senha não será salva</span></span>
        </label>

        <Button
          type="submit"
          variant="primary"
          className="h-12 w-full bg-[linear-gradient(110deg,#16c69a,#82df4f)] text-[#03120d] shadow-[0_14px_32px_-20px_rgba(40,210,155,0.9)] transition-[filter,box-shadow,transform] hover:bg-[linear-gradient(110deg,#1bd2a3,#8be85a)] hover:shadow-[0_16px_36px_-18px_rgba(40,210,155,0.85)] hover:brightness-105 active:translate-y-px active:bg-[linear-gradient(110deg,#12ba90,#75d545)]"
          disabled={busy}
        >
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <ArrowRight className="h-4 w-4" aria-hidden />}
          {busy ? "Entrando..." : "Entrar"}
        </Button>

        <p className="pt-1 text-center text-sm text-[#8b9b95]">
          Ainda não tem uma conta?{" "}
          <Link to="/cadastro" className="font-semibold text-[#53dcb5] underline-offset-4 transition-colors hover:text-[#82e16b] hover:underline focus-visible:outline-[#53dcb5]">
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
            src="/brand/contai-logo.png?v=20260828"
            alt="Contaí — Entende. Organiza. Faz crescer."
            width="1536"
            height="1024"
            className="block h-auto w-full object-contain mix-blend-screen"
          />
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#53dcb5]">Clareza para decidir melhor</p>
        <h1 id="mobile-intro-title" className="text-balance text-[2.35rem] font-semibold leading-[1.04] tracking-[-0.055em] text-[#f4faf7]">
          Sua vida financeira, <span className="text-[#72df68]">organizada</span> em um só lugar.
        </h1>
        <p className="mt-4 text-base leading-7 text-[#9baaa5]">
          Acompanhe lançamentos, metas e vencimentos com uma visão simples, privada e feita para a sua rotina.
        </p>

        <div className="mt-6 grid grid-cols-3 gap-2" aria-label="Benefícios">
          <IntroBenefit icon={ShieldCheck} label="Sessão segura" />
          <IntroBenefit icon={WalletCards} label="Dados privados" />
          <IntroBenefit icon={Sparkles} label="Assistente" />
        </div>
      </div>

      <div className="mt-8 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <Button
          type="button"
          variant="primary"
          onClick={onContinue}
          className="h-14 w-full rounded-2xl bg-[linear-gradient(110deg,#16c69a,#82df4f)] text-base font-semibold text-[#03120d] shadow-[0_18px_42px_-20px_rgba(40,210,155,0.9)] transition-[filter,box-shadow,transform] hover:bg-[linear-gradient(110deg,#1bd2a3,#8be85a)] hover:brightness-105 active:translate-y-px"
        >
          Acessar minha conta
          <ArrowRight className="h-5 w-5" aria-hidden />
        </Button>
        <p className="mt-4 text-center text-xs leading-5 text-[#71817b]">Seus dados continuam protegidos e privados.</p>
      </div>
    </section>
  )
}

function IntroBenefit({ icon: Icon, label }: { icon: typeof ShieldCheck; label: string }) {
  return (
    <div className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-2 py-3 text-center text-[11px] leading-4 text-[#a8b7b2]">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#103028] text-[#51dcb3]">
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      {label}
    </div>
  )
}
