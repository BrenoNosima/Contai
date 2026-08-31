import { useEffect, useState, type ReactNode } from "react"
import { RefreshCw, Server } from "lucide-react"
import { AnimatedLogo } from "@/components/animated-logo"
import { Button } from "@/components/ui/primitives"
import { waitForBackend, type BackendAvailability } from "@/lib/backend-health"

type GateState = "checking" | "starting" | Exclude<BackendAvailability, "ready">

export function BackendStartupGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>("checking")
  const [attempt, setAttempt] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setState("checking")

    waitForBackend({
      signal: controller.signal,
      onWaiting: () => setState("starting"),
    }).then((result) => {
      if (result === "ready") setReady(true)
      else setState(result)
    }).catch(() => {
      if (!controller.signal.aborted) setState("unavailable")
    })

    return () => controller.abort()
  }, [attempt])

  if (ready) return children

  const failed = state === "timeout" || state === "unavailable"
  const title = failed ? "Não foi possível iniciar agora" : "Preparando seu ambiente..."
  const description = failed
    ? "O Contaí está temporariamente indisponível. Aguarde um instante e tente novamente."
    : state === "starting"
      ? "Nosso servidor está acordando. Isso pode levar alguns segundos no primeiro acesso."
      : "Estamos verificando se está tudo pronto para você."

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-5 py-10 sm:px-8">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 opacity-[0.025] [background-image:linear-gradient(rgba(255,255,255,.32)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.32)_1px,transparent_1px)] [background-size:56px_56px]" />
        <div className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-income/[0.055] blur-3xl sm:h-[38rem] sm:w-[38rem]" />
      </div>

      <section
        className="relative w-full max-w-md animate-in rounded-3xl border border-border bg-surface/90 px-6 py-8 text-center shadow-[0_30px_80px_-42px_rgba(0,0,0,0.95)] backdrop-blur-sm sm:px-10 sm:py-10"
        role={failed ? "alert" : "status"}
        aria-live="polite"
        aria-busy={!failed}
      >
        <AnimatedLogo className="mb-9" imageClassName="w-36 sm:w-40" />

        <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border-strong bg-surface-2 text-income">
          {!failed && <span className="startup-pulse absolute inset-[-9px] rounded-[1.35rem] border border-income/25" aria-hidden />}
          {failed ? <Server className="h-7 w-7" aria-hidden /> : <StartupLoader />}
        </div>

        <h1 className="text-balance text-2xl font-semibold tracking-[-0.035em] text-foreground sm:text-[1.75rem]">{title}</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted sm:text-base sm:leading-7">{description}</p>

        {failed ? (
          <Button className="mt-7 w-full sm:w-auto" variant="primary" onClick={() => { setReady(false); setAttempt((value) => value + 1) }}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            Tentar novamente
          </Button>
        ) : (
          <div className="mt-7 flex items-center justify-center gap-2 text-xs font-medium text-subtle">
            <span className="h-1.5 w-1.5 rounded-full bg-income" aria-hidden />
            Você continuará automaticamente
          </div>
        )}
      </section>
    </main>
  )
}

function StartupLoader() {
  return (
    <svg className="h-8 w-8 startup-spinner" viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="12" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2.5" />
      <path d="M16 4a12 12 0 0 1 10.4 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
