import { Navigate, Outlet, useLocation } from "react-router-dom"
import { LoaderCircle } from "lucide-react"
import { useAuth } from "@/lib/auth"

export function PrivateGuard() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <AuthLoading />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

export function PublicOnlyGuard() {
  const { user, loading } = useAuth()
  if (loading) return <AuthLoading />
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}

function AuthLoading() {
  return <main className="flex min-h-dvh items-center justify-center bg-background" role="status" aria-label="Verificando autenticação">
    <LoaderCircle className="h-7 w-7 animate-spin text-primary" aria-hidden />
  </main>
}
