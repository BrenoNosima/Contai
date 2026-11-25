export interface StoredChatMessage { id: string; role: "user" | "assistant"; content: string; error?: boolean }
const prefix = "contai:chat:"

export function loadChat(userId: number | undefined): StoredChatMessage[] {
  if (!userId) return []
  try {
    const items: unknown = JSON.parse(sessionStorage.getItem(prefix + userId) ?? "[]")
    return Array.isArray(items) ? items.filter((m): m is StoredChatMessage =>
      m && typeof m.id === "string" && ["user", "assistant"].includes(m.role) && typeof m.content === "string").slice(-100) : []
  } catch { return [] }
}

export function saveChat(userId: number | undefined, items: StoredChatMessage[]) {
  if (!userId) return
  try {
    const selected = items.slice(-100).map(({ id, role, content, error }) => ({ id, role, content, error }))
    while (JSON.stringify(selected).length > 80_000) selected.shift()
    sessionStorage.setItem(prefix + userId, JSON.stringify(selected))
  } catch { /* Storage may be unavailable; the conversation still works. */ }
}

export function clearChatStorage() {
  try { Object.keys(sessionStorage).filter((key) => key.startsWith(prefix)).forEach((key) => sessionStorage.removeItem(key)) }
  catch { /* No persistent storage access. */ }
}
