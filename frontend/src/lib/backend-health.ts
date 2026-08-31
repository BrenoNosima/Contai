const RAW_BASE = import.meta.env.VITE_API_URL as string | undefined
const API_BASE = RAW_BASE ? RAW_BASE.replace(/\/$/, "") : import.meta.env.DEV ? "/api" : ""

export const BACKEND_STARTUP_TIMEOUT_MS = 90_000
export const BACKEND_RETRY_INTERVAL_MS = 3_000
export const HEALTH_REQUEST_TIMEOUT_MS = 8_000

export type BackendAvailability = "ready" | "timeout" | "unavailable"

interface WaitForBackendOptions {
  signal: AbortSignal
  onWaiting?: () => void
  startupTimeoutMs?: number
  retryIntervalMs?: number
  requestTimeoutMs?: number
}

const COLD_START_STATUSES = new Set([408, 429, 502, 503, 504])

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      globalThis.clearTimeout(timeout)
      reject(new DOMException("Aborted", "AbortError"))
    }
    const timeout = globalThis.setTimeout(() => {
      signal.removeEventListener("abort", onAbort)
      resolve()
    }, ms)
    signal.addEventListener("abort", onAbort, { once: true })
  })
}

async function checkHealth(signal: AbortSignal, requestTimeoutMs: number) {
  const controller = new AbortController()
  const abortRequest = () => controller.abort()
  const timeout = globalThis.setTimeout(abortRequest, requestTimeoutMs)
  signal.addEventListener("abort", abortRequest, { once: true })

  try {
    const response = await fetch(`${API_BASE}/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    })

    if (!response.ok) {
      return COLD_START_STATUSES.has(response.status) ? "retry" : "unavailable"
    }

    try {
      const body = await response.json() as { status?: unknown }
      return body.status === "healthy" ? "ready" : "unavailable"
    } catch {
      return "unavailable"
    }
  } catch (error) {
    if (signal.aborted) throw error
    return "retry"
  } finally {
    globalThis.clearTimeout(timeout)
    signal.removeEventListener("abort", abortRequest)
  }
}

export async function waitForBackend({
  signal,
  onWaiting,
  startupTimeoutMs = BACKEND_STARTUP_TIMEOUT_MS,
  retryIntervalMs = BACKEND_RETRY_INTERVAL_MS,
  requestTimeoutMs = HEALTH_REQUEST_TIMEOUT_MS,
}: WaitForBackendOptions): Promise<BackendAvailability> {
  const startedAt = Date.now()

  while (!signal.aborted) {
    const result = await checkHealth(signal, requestTimeoutMs)
    if (result === "ready" || result === "unavailable") return result

    onWaiting?.()
    const remaining = startupTimeoutMs - (Date.now() - startedAt)
    if (remaining <= 0) return "timeout"
    await wait(Math.min(retryIntervalMs, remaining), signal)
  }

  throw new DOMException("Aborted", "AbortError")
}
