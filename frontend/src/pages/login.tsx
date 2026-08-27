import { useState, type FormEvent } from "react"
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, UserRound } from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { AuthLayout } from "@/components/auth-layout"
import { Button, Input, Label } from "@/components/ui/primitives"
import { ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"

const REMEMBERED_EMAIL_KEY = "contai.remembered-email"

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? "")
  const [password, setPassword] = useState("")
  const [rememberLogin, setRememberLogin] = useState(() => Boolean(localStorage.getItem(REMEMBERED_EMAIL_KEY)))
  const [show, setShow] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

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
      navigate((location.state as { from?: string } | null)?.from ?? "/", { replace: true })
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Não foi possível entrar. Tente novamente.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Bem-vindo de volta" subtitle="Entre para continuar cuidando da sua vida financeira." titleIcon={UserRound}>
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
          <span>Lembrar login <span className="hidden text-xs text-[#687873] sm:inline">— salva somente seu e-mail</span></span>
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
