import { useState, type FormEvent } from "react"
import { Eye, EyeOff, LoaderCircle, UserPlus } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { AuthLayout } from "@/components/auth-layout"
import { Button, Input, Label } from "@/components/ui/primitives"
import { ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"

export default function RegisterPage() {
  const { register } = useAuth(); const navigate = useNavigate()
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState("")
  const [show, setShow] = useState(false); const [error, setError] = useState(""); const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("")
    if (name.trim().length < 2) { setError("Informe seu nome."); return }
    if (!email.includes("@")) { setError("Informe um e-mail válido."); return }
    if (password.length < 8) { setError("A senha deve ter pelo menos 8 caracteres."); return }
    if (password !== confirmation) { setError("As senhas não coincidem."); return }
    setBusy(true)
    try { await register(name, email, password, confirmation); navigate("/", { replace: true }) }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "Não foi possível criar sua conta.") }
    finally { setBusy(false) }
  }
  return <AuthLayout title="Crie sua conta" subtitle="Comece a organizar seus compromissos financeiros com privacidade.">
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && <div role="alert" className="rounded-xl border border-expense/30 bg-expense-soft px-4 py-3 text-sm text-expense">{error}</div>}
      <div><Label htmlFor="name">Nome</Label><Input id="name" autoComplete="name" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div><Label htmlFor="email">E-mail</Label><Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div><Label htmlFor="password">Senha</Label><div className="relative"><Input id="password" type={show ? "text" : "password"} autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="pr-12" aria-describedby="password-hint" /><button type="button" onClick={() => setShow(!show)} aria-label={show ? "Ocultar senhas" : "Mostrar senhas"} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted hover:text-foreground">{show ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}</button></div><p id="password-hint" className="mt-1.5 text-xs text-subtle">Use pelo menos 8 caracteres.</p></div>
      <div><Label htmlFor="confirmation">Confirmar senha</Label><Input id="confirmation" type={show ? "text" : "password"} autoComplete="new-password" required minLength={8} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></div>
      <Button type="submit" variant="primary" className="w-full" disabled={busy}>{busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <UserPlus className="h-4 w-4" aria-hidden />}{busy ? "Criando conta..." : "Criar conta"}</Button>
      <p className="text-center text-sm text-muted">Já tem uma conta? <Link to="/login" state={{ showLogin: true }} className="font-semibold text-foreground underline-offset-4 hover:underline">Entrar</Link></p>
    </form>
  </AuthLayout>
}
