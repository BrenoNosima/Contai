import { afterEach, describe, expect, it, vi } from "vitest"
import { waitForBackend } from "./backend-health"

const fetchMock = vi.fn()
vi.stubGlobal("fetch", fetchMock)

afterEach(() => {
  fetchMock.mockReset()
  vi.useRealTimers()
})

describe("backend startup health check", () => {
  it("continues as soon as the backend is healthy", async () => {
    fetchMock.mockResolvedValue(new Response('{"status":"healthy"}', {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }))

    const result = await waitForBackend({ signal: new AbortController().signal })

    expect(result).toBe("ready")
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it("classifies an unexpected response as a real unavailability", async () => {
    fetchMock.mockResolvedValue(new Response('{"detail":"not found"}', { status: 404 }))

    const result = await waitForBackend({ signal: new AbortController().signal })

    expect(result).toBe("unavailable")
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it("retries transient startup failures until the overall timeout", async () => {
    vi.useFakeTimers()
    fetchMock.mockRejectedValue(new TypeError("network unavailable"))

    const resultPromise = waitForBackend({
      signal: new AbortController().signal,
      startupTimeoutMs: 6_000,
      retryIntervalMs: 3_000,
      requestTimeoutMs: 1_000,
    })
    await vi.advanceTimersByTimeAsync(6_000)

    await expect(resultPromise).resolves.toBe("timeout")
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
