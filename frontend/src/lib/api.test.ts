import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  ApiError,
  chatApi,
  goalsApi,
  transactionsApi,
} from "./api"


const fetchMock = vi.fn()
vi.stubGlobal("fetch", fetchMock)

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function mockMutationResponse(body: unknown, status = 200) {
  fetchMock.mockImplementation((url: string) =>
    url.endsWith("/auth/csrf")
      ? Promise.resolve(jsonResponse({ csrf_token: "test-csrf" }))
      : Promise.resolve(jsonResponse(body, status)),
  )
}

beforeEach(() => {
  fetchMock.mockReset()
})

describe("API client contracts", () => {
  it("times out stalled chat requests and aborts the fetch", async () => {
    vi.useFakeTimers()
    let signal: AbortSignal | undefined
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url.endsWith("/auth/csrf")) return Promise.resolve(jsonResponse({ csrf_token: "test-csrf" }))
      signal = init?.signal ?? undefined
      return new Promise(() => {})
    })
    try {
      const result = expect(chatApi.send("Compare os meses")).rejects.toMatchObject({ status: 504 })
      await vi.advanceTimersByTimeAsync(130_000)
      await result
      expect(signal?.aborted).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it("limits chat context without cutting individual messages", async () => {
    mockMutationResponse({ response: "ok" })
    const history = Array.from({ length: 30 }, (_, i) => ({ role: "user" as const, content: `${i}`.padEnd(1000, "x") }))
    await chatApi.send("Compare os meses", history)
    const call = fetchMock.mock.calls.find(([url]) => url.endsWith("/chat/"))
    expect(JSON.parse(call![1].body).chat_history).toEqual(history.slice(-16))
  })

  it("serializes transaction filters expected by the backend", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]))

    await transactionsApi.list({
      type: "expense",
      category: "Casa & Jardim",
      is_recurring: false,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/transactions/?type=expense&category=Casa+%26+Jardim&is_recurring=false",
      expect.objectContaining({
        headers: { "Content-Type": "application/json" },
      }),
    )
  })

  it("uses PATCH and the status body expected by the transaction route", async () => {
    mockMutationResponse({ status: "paid" })

    await transactionsApi.setStatus(42, "paid")

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/transactions/42/status",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "paid" }),
      }),
    )
  })

  it("sends goal progress in the request body", async () => {
    mockMutationResponse({ id: 7 })

    await goalsApi.addProgress(7, 150)

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/goals/7/progress",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ amount: 150 }),
      }),
    )
  })

  it("maps chat history to the backend field name", async () => {
    mockMutationResponse({ response: "ok" })

    await chatApi.send("Meu saldo?", [
      { role: "user", content: "Olá" },
      { role: "assistant", content: "Como posso ajudar?" },
    ])

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chat/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          message: "Meu saldo?",
          chat_history: [
            { role: "user", content: "Olá" },
            { role: "assistant", content: "Como posso ajudar?" },
          ],
        }),
      }),
    )
  })

  it("preserves a safe API error returned by the backend", async () => {
    mockMutationResponse({ detail: "Informe o valor do progresso." }, 422)

    await expect(goalsApi.addProgress(7, 0)).rejects.toMatchObject({
      name: "ApiError",
      status: 422,
      message: "Informe o valor do progresso.",
    } satisfies Partial<ApiError>)
  })

  it("normalizes network failures", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"))

    await expect(transactionsApi.list()).rejects.toMatchObject({
      name: "ApiError",
      status: 0,
      message: "Não foi possível conectar ao servidor. Verifique se a API está no ar.",
    } satisfies Partial<ApiError>)
  })
})
