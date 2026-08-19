import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createBrowserRouter, Navigate } from "react-router-dom"
import { queryClient } from "@/lib/query"
import { AppShell } from "@/components/app-shell"
import { ToastProvider } from "@/components/ui/toast"
import OverviewPage from "@/pages/overview"
import CalendarPage from "@/pages/calendar"
import TransactionsPage from "@/pages/transactions"
import GoalsPage from "@/pages/goals"
import ReportsPage from "@/pages/reports"
import FixedExpensesPage from "@/pages/fixed-expenses"
import ChatPage from "@/pages/chat"
import "./index.css"

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: "calendario", element: <CalendarPage /> },
      { path: "lancamentos", element: <TransactionsPage /> },
      { path: "metas", element: <GoalsPage /> },
      { path: "relatorios", element: <ReportsPage /> },
      { path: "gastos-fixos", element: <FixedExpensesPage /> },
      { path: "assistente", element: <ChatPage /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
])

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
)
