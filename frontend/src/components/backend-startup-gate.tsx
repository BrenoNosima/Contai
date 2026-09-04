import { useEffect, useState, type ReactNode } from "react"
import { RefreshCw, Server } from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"
import { Button } from "@/components/ui/primitives"
import { waitForBackend, type BackendAvailability } from "@/lib/backend-health"
import { DEMO_MODE } from "@/lib/demo-api"

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

  if (DEMO_MODE || ready) return children

  const failed = state === "timeout" || state === "unavailable"
  const title = failed ? "Servidor indisponível" : "Conectando ao Contaí"
  const description = failed
    ? "O Contaí está temporariamente indisponível. Aguarde um instante e tente novamente."
    : state === "starting"
      ? "Nosso servidor está acordando. Isso pode levar alguns segundos no primeiro acesso."
      : "Estamos verificando se está tudo pronto para você."

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5 py-10 sm:px-8">
      <section
        className="w-full max-w-md animate-in px-2 py-8 text-center sm:px-6 sm:py-10"
        role={failed ? "alert" : "status"}
        aria-live="polite"
        aria-busy={!failed}
      >
        <BrandLogo className="mb-9 justify-center" imageClassName="w-36 sm:w-40" />

        <div className="relative mx-auto mb-6 flex h-12 w-12 items-center justify-center text-income">
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
