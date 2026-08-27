import { useState, type FormEvent } from "react"
import { Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react"
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
  const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? ""
  const [email, setEmail] = useState(rememberedEmail)
  const [password, setPassword] = useState("")
  const [rememberLogin, setRememberLogin] = useState(Boolean(rememberedEmail))
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
    <AuthLayout title="Bem-vindo de volta" subtitle="Entre para continuar cuidando da sua vida financeira.">
      <form onSubmit={submit} className="space-y-5" noValidate>
        {error && <div role="alert" className="rounded-xl border border-expense/30 bg-expense-soft px-4 py-3 text-sm text-expense">{error}</div>}
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" />
        </div>
        <div>
          <Label htmlFor="password">Senha</Label>
          <div className="relative">
            <Input id="password" type={show ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="pr-12" />
            <button type="button" onClick={() => setShow((current) => !current)} aria-label={show ? "Ocultar senha" : "Mostrar senha"} aria-pressed={show} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-3px]">
              {show ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
            </button>
          </div>
        </div>
        <label htmlFor="remember-login" className="flex min-h-11 items-start gap-3 rounded-lg py-1 text-sm text-muted">
          <input id="remember-login" type="checkbox" checked={rememberLogin} onChange={(event) => {
            setRememberLogin(event.target.checked)
            if (!event.target.checked) localStorage.removeItem(REMEMBERED_EMAIL_KEY)
          }} className="mt-0.5 h-5 w-5 shrink-0 accent-foreground" />
          <span>
            <span className="block font-medium text-foreground">Lembrar login</span>
            <span className="mt-0.5 block text-xs text-subtle">Salva somente seu e-mail neste dispositivo.</span>
          </span>
        </label>
        <Button type="submit" variant="primary" className="w-full" disabled={busy}>
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <LogIn className="h-4 w-4" aria-hidden />}
          {busy ? "Entrando..." : "Entrar"}
        </Button>
        <p className="text-center text-sm text-muted">Ainda não tem uma conta? <Link to="/cadastro" className="font-semibold text-foreground underline-offset-4 hover:underline">Criar conta</Link></p>
      </form>
    </AuthLayout>
  )
}
