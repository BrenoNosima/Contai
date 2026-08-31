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
import "@fontsource-variable/geist"
import "@fontsource-variable/geist-mono"
import "./index.css"

const lazyPage = (loader: () => Promise<{ default: ComponentType }>) =>
  async () => ({ Component: (await loader()).default })

const router = createBrowserRouter([
  {
    element: <PublicOnlyGuard />,
    children: [
      { path: "/login", lazy: lazyPage(() => import("@/pages/login")) },
      { path: "/cadastro", lazy: lazyPage(() => import("@/pages/register")) },
    ],
  },
  {
    element: <PrivateGuard />,
    children: [{
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
        { path: "*", element: <Navigate to="/" replace /> },
      ],
    }],
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
