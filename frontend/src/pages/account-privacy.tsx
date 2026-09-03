import { useState, type FormEvent } from "react"
import { Download, Save, ShieldCheck, Trash2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { PageHeader } from "@/components/page-header"
import { Button, Card, Input, Label } from "@/components/ui/primitives"
import { ApiError, authApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useToast } from "@/components/ui/toast"

export default function AccountPrivacyPage() {
  const { user, updateProfile, clearSession } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [name, setName] = useState(user?.name ?? "")
  const [email, setEmail] = useState(user?.email ?? "")
  const [password, setPassword] = useState("")
  const [deletePassword, setDeletePassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState("")

  async function save(event: FormEvent) {
    event.preventDefault(); setError(""); setBusy("save")
    try { await updateProfile(name, email, password); setPassword(""); toast("Dados cadastrais atualizados.") }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "Não foi possível atualizar os dados.") }
    finally { setBusy(null) }
  }
  async function download() {
    setError(""); setBusy("export")
    try {
      const data = await authApi.exportData()
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }))
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `contai-dados-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url)
      toast("Cópia dos seus dados preparada.")
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Não foi possível exportar os dados.") }
    finally { setBusy(null) }
  }
  async function remove(event: FormEvent) {
    event.preventDefault(); setError(""); setBusy("delete")
    try { await authApi.deleteAccount(deletePassword, confirmation); clearSession(); navigate("/login", { replace: true }) }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "Não foi possível excluir a conta."); setBusy(null) }
  }
  return <>
    <PageHeader title="Conta e privacidade" subtitle="Controle seus dados cadastrais e exerça seus direitos de acesso, correção e eliminação." />
    {error && <div role="alert" className="mb-5 rounded-xl border border-expense/30 bg-expense-soft px-4 py-3 text-sm text-expense">{error}</div>}
    <div className="grid gap-5 lg:grid-cols-2">
      <Card><div className="mb-5 flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-primary" aria-hidden /><h2 className="text-lg font-semibold">Dados cadastrais</h2></div>
        <form className="space-y-4" onSubmit={save}>
          <div><Label htmlFor="profile-name">Nome</Label><Input id="profile-name" autoComplete="name" required minLength={2} value={name} onChange={e => setName(e.target.value)} /></div>
          <div><Label htmlFor="profile-email">E-mail</Label><Input id="profile-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div><Label htmlFor="profile-password">Senha atual para confirmar</Label><Input id="profile-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
          <Button type="submit" variant="primary" disabled={busy !== null}><Save className="h-4 w-4" aria-hidden />{busy === "save" ? "Salvando..." : "Salvar alterações"}</Button>
        </form>
      </Card>
      <div className="space-y-5">
        <Card><h2 className="text-lg font-semibold">Cópia dos seus dados</h2><p className="mt-2 text-sm leading-6 text-muted">Baixe cadastro, lançamentos, metas, gastos fixos e ações do assistente em JSON.</p><Button className="mt-5" onClick={download} disabled={busy !== null}><Download className="h-4 w-4" aria-hidden />{busy === "export" ? "Preparando..." : "Baixar meus dados"}</Button></Card>
        <Card className="border border-expense/25"><h2 className="text-lg font-semibold text-expense">Excluir conta</h2><p className="mt-2 text-sm leading-6 text-muted">A exclusão remove o cadastro e os dados financeiros ativos. Esta ação não pode ser desfeita.</p>
          <form className="mt-5 space-y-4" onSubmit={remove}>
            <div><Label htmlFor="delete-password">Senha atual</Label><Input id="delete-password" type="password" autoComplete="current-password" required value={deletePassword} onChange={e => setDeletePassword(e.target.value)} /></div>
            <div><Label htmlFor="delete-confirmation">Digite EXCLUIR MINHA CONTA</Label><Input id="delete-confirmation" required value={confirmation} onChange={e => setConfirmation(e.target.value)} /></div>
            <Button type="submit" variant="danger" disabled={busy !== null || confirmation !== "EXCLUIR MINHA CONTA"}><Trash2 className="h-4 w-4" aria-hidden />{busy === "delete" ? "Excluindo..." : "Excluir definitivamente"}</Button>
          </form>
        </Card>
      </div>
    </div>
  </>
}
