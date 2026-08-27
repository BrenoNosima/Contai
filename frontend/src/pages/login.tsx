import { useState, type FormEvent } from "react"
import { Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { AuthLayout } from "@/components/auth-layout"
import { Button, Input, Label } from "@/components/ui/primitives"
import { ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"

export default function LoginPage() {
  const { login } = useAuth(); const navigate = useNavigate(); const location = useLocation()
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("")
  const [show, setShow] = useState(false); const [error, setError] = useState(""); const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setBusy(true)
    if (!email.trim() || !password) { setError("Informe seu e-mail e sua senha."); setBusy(false); return }
    try { await login(email, password); navigate((location.state as { from?: string } | null)?.from ?? "/", { replace: true }) }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "Não foi possível entrar. Tente novamente.") }
    finally { setBusy(false) }
  }
  return <AuthLayout title="Bem-vindo de volta" subtitle="Entre para continuar cuidando da sua vida financeira.">
    <form onSubmit={submit} className="space-y-5" noValidate>
      {error && <div role="alert" className="rounded-xl border border-expense/30 bg-expense-soft px-4 py-3 text-sm text-expense">{error}</div>}
      <div><Label htmlFor="email">E-mail</Label><Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" /></div>
      <div><Label htmlFor="password">Senha</Label><div className="relative"><Input id="password" type={show ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="pr-12" /><button type="button" onClick={() => setShow(!show)} aria-label={show ? "Ocultar senha" : "Mostrar senha"} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted hover:text-foreground">{show ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}</button></div></div>
      <Button type="submit" variant="primary" className="w-full" disabled={busy}>{busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <LogIn className="h-4 w-4" aria-hidden />}{busy ? "Entrando..." : "Entrar"}</Button>
      <p className="text-center text-sm text-muted">Ainda não tem uma conta? <Link to="/cadastro" className="font-semibold text-foreground underline-offset-4 hover:underline">Criar conta</Link></p>
    </form>
  </AuthLayout>
}
