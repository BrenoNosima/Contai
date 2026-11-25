// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest"
import { clearChatStorage, loadChat, saveChat } from "./chat-storage"

afterEach(clearChatStorage)
describe("Ephemeral chat storage", () => {
  it("keeps users separate and never persists proposal payloads", () => {
    saveChat(1, [{ id: "one", role: "user", content: "Synthetic" }])
    expect(loadChat(2)).toEqual([])
    expect(loadChat(1)[0].content).toBe("Synthetic")
    clearChatStorage()
    expect(loadChat(1)).toEqual([])
  })
  it("recovers from corrupted storage", () => {
    sessionStorage.setItem("contai:chat:1", "not json")
    expect(loadChat(1)).toEqual([])
  })
})
