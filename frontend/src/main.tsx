import { StrictMode, type ComponentType } from "react"
import { createRoot } from "react-dom/client"
import { QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createBrowserRouter, Navigate } from "react-router-dom"
import { queryClient } from "@/lib/query"
import { AppShell } from "@/components/app-shell"
import { ToastProvider } from "@/components/ui/toast"
import { AuthProvider } from "@/lib/auth"
import { PrivateGuard, PublicOnlyGuard } from "@/components/auth-guard"
import { BackendStartupGate } from "@/components/backend-startup-gate"
import { AnimatedLogo } from "@/components/animated-logo"
import "@fontsource-variable/geist"
import "@fontsource-variable/geist-mono"
import "./index.css"

const lazyPage = (loader: () => Promise<{ default: ComponentType }>) =>
  async () => ({ Component: (await loader()).default })

function RouteHydrateFallback() {
  return (
    <main
      className="flex min-h-dvh items-center justify-center bg-background px-5"
      role="status"
      aria-label="Carregando o Contaí"
    >
      <AnimatedLogo imageClassName="w-28 sm:w-32" />
    </main>
  )
}

const router = createBrowserRouter([
  {
    path: "/privacidade",
    lazy: lazyPage(() => import("@/pages/privacy")),
  },
  {
    element: <PublicOnlyGuard />,
    HydrateFallback: RouteHydrateFallback,
    children: [
      { path: "/login", lazy: lazyPage(() => import("@/pages/login")) },
      { path: "/cadastro", lazy: lazyPage(() => import("@/pages/register")) },
    ],
  },
  {
    element: <PrivateGuard />,
    HydrateFallback: RouteHydrateFallback,
    children: [
      { path: "/alterar-senha", lazy: lazyPage(() => import("@/pages/change-password")) },
      {
      path: "/",
      element: <AppShell />,
      children: [
        { index: true, lazy: lazyPage(() => import("@/pages/overview")) },
      { path: "calendario", lazy: lazyPage(() => import("@/pages/calendar")) },
      {
        path: "lancamentos",
        lazy: lazyPage(() => import("@/pages/transactions")),
      },
      { path: "metas", lazy: lazyPage(() => import("@/pages/goals")) },
      { path: "relatorios", lazy: lazyPage(() => import("@/pages/reports")) },
      {
        path: "gastos-fixos",
        lazy: lazyPage(() => import("@/pages/fixed-expenses")),
      },
      { path: "assistente", lazy: lazyPage(() => import("@/pages/chat")) },
        { path: "conta-e-privacidade", lazy: lazyPage(() => import("@/pages/account-privacy")) },
        { path: "*", element: <Navigate to="/" replace /> },
      ],
      },
    ],
  },
])

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BackendStartupGate>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BackendStartupGate>
  </StrictMode>,
)
