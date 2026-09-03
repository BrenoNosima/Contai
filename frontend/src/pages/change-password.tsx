import { useMemo, useState, type FormEvent } from "react"
import { Check, Eye, EyeOff, KeyRound, LoaderCircle, LogOut } from "lucide-react"
import { AuthLayout } from "@/components/auth-layout"
import { Button, Input, Label } from "@/components/ui/primitives"
import { ApiError, authApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"

export default function ChangePasswordPage() {
  const { clearSession, logout } = useAuth()
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const checks = useMemo(() => [
    [next.length >= 8 && next.length <= 128, "8 a 128 caracteres"],
    [/[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(next), "Uma letra maiúscula"],
    [/[a-záàâãéêíóôõúç]/.test(next), "Uma letra minúscula"],
    [/\d/.test(next), "Um número"],
    [/[^\p{L}\p{N}\s]/u.test(next), "Um caractere especial"],
    [next.length > 0 && next === confirmation, "As senhas coincidem"],
  ] as const, [next, confirmation])
  const valid = checks.every(([ok]) => ok) && current.length > 0 && current !== next

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setBusy(true)
    try {
      await authApi.changePassword(current, next, confirmation)
      clearSession()
      window.location.assign("/login")
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Não foi possível alterar sua senha.")
      setBusy(false)
    }
  }

  return <AuthLayout title="Atualize sua senha" subtitle="Para proteger seus dados financeiros, você precisa criar uma senha mais forte antes de continuar." titleIcon={KeyRound}>
    <div className="mb-5 rounded-xl border border-warning/25 bg-warning-soft/65 px-4 py-3 text-sm leading-6 text-warning" role="status">
      Sua senha foi criada antes da política atual. Não sabemos se ela é fraca porque armazenamos somente seu hash; por segurança, a troca é obrigatória.
    </div>
    <form className="space-y-4" onSubmit={submit} aria-describedby={error ? "change-password-error" : undefined}>
      {error && <div id="change-password-error" role="alert" className="rounded-xl border border-expense/25 bg-expense-soft/70 px-4 py-3 text-sm text-expense">{error}</div>}
      <div><Label htmlFor="current-password" className="mb-2 text-auth-label">Senha atual</Label><Input id="current-password" type={show ? "text" : "password"} autoComplete="current-password" required value={current} onChange={e => setCurrent(e.target.value)} className="h-12 border-white/[0.09] bg-auth-field text-auth-text" /></div>
      <div><Label htmlFor="new-password" className="mb-2 text-auth-label">Nova senha</Label><Input id="new-password" type={show ? "text" : "password"} autoComplete="new-password" required value={next} onChange={e => setNext(e.target.value)} className="h-12 border-white/[0.09] bg-auth-field text-auth-text" /></div>
      <div><Label htmlFor="new-password-confirmation" className="mb-2 text-auth-label">Confirmar nova senha</Label><Input id="new-password-confirmation" type={show ? "text" : "password"} autoComplete="new-password" required value={confirmation} onChange={e => setConfirmation(e.target.value)} className="h-12 border-white/[0.09] bg-auth-field text-auth-text" /></div>
      <button type="button" onClick={() => setShow(value => !value)} aria-pressed={show} className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm text-auth-muted hover:text-auth-heading">{show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}{show ? "Ocultar senhas" : "Mostrar senhas"}</button>
      <ul className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2" aria-label="Requisitos da nova senha">
        {checks.map(([ok, label]) => <li key={label} className={ok ? "flex items-center gap-2 text-auth-accent-lime" : "flex items-center gap-2 text-auth-subtle"}><span className="flex h-5 w-5 items-center justify-center rounded-full border border-current" aria-hidden>{ok && <Check className="h-3 w-3" />}</span>{label}</li>)}
      </ul>
      <Button type="submit" variant="primary" className="h-12 w-full" disabled={!valid || busy}>{busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <KeyRound className="h-4 w-4" aria-hidden />}{busy ? "Alterando..." : "Alterar senha e entrar novamente"}</Button>
      <Button type="button" variant="ghost" className="w-full text-auth-muted" onClick={() => logout()} disabled={busy}><LogOut className="h-4 w-4" aria-hidden />Sair</Button>
    </form>
  </AuthLayout>
}
