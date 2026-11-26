import { useState } from "react"
import { AVATARS, UserAvatar, type AvatarId } from "./user-avatar"
import { Button, Card } from "./ui/primitives"
import { cn } from "@/lib/utils"

export function AvatarPicker({ value, onSave }: { value?: string; onSave: (id: AvatarId) => Promise<void> }) {
  const saved = AVATARS.find((item) => item.id === value)?.id ?? "person"
  const [selected, setSelected] = useState<AvatarId>(saved)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  async function save() {
    setSaving(true); setError(""); setMessage("")
    try { await onSave(selected); setMessage("Avatar atualizado.") }
    catch { setError("Não foi possível salvar o avatar. Tente novamente.") }
    finally { setSaving(false) }
  }
  return <Card className="mb-5">
    <div className="mb-5 flex flex-wrap items-center gap-4">
      <UserAvatar id={selected} large />
      <div className="min-w-0 flex-1"><h2 id="avatar-title" className="text-lg font-semibold">Seu avatar</h2><p className="mt-1 text-sm text-muted">Escolha um ícone para representar você no Contaí.</p></div>
    </div>
    <div role="radiogroup" aria-labelledby="avatar-title" className="grid grid-cols-4 gap-2 sm:grid-cols-8">
      {AVATARS.map((avatar, index) => <button key={avatar.id} type="button" role="radio" aria-label={avatar.label} aria-checked={selected === avatar.id} tabIndex={selected === avatar.id ? 0 : -1} disabled={saving}
        onClick={() => { setSelected(avatar.id); setMessage(""); setError("") }}
        onKeyDown={(event) => {
          const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0
          if (!direction && event.key !== "Home" && event.key !== "End") return
          event.preventDefault()
          const next = event.key === "Home" ? 0 : event.key === "End" ? AVATARS.length - 1 : (index + direction + AVATARS.length) % AVATARS.length
          setSelected(AVATARS[next].id); setMessage(""); setError("")
          const group = event.currentTarget.parentElement
          ;(group?.children[next] as HTMLButtonElement)?.focus()
        }}
        className={cn("flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border px-1 py-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50", selected === avatar.id ? "border-primary bg-primary/10" : "border-border hover:border-border-strong hover:bg-surface-2")}>
        <UserAvatar id={avatar.id} /><span className="text-[11px] text-muted">{avatar.label}</span>
      </button>)}
    </div>
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <Button type="button" variant="primary" disabled={saving || selected === saved} onClick={save}>{saving ? "Salvando..." : "Salvar avatar"}</Button>
      {message && <p role="status" className="text-sm text-income">{message}</p>}
      {error && <p role="alert" className="text-sm text-expense">{error}</p>}
    </div>
  </Card>
}
