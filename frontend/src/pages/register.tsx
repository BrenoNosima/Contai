import { useState, type FormEvent, type ReactNode } from "react"
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  UserPlus,
  UserRound,
} from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { AuthLayout } from "@/components/auth-layout"
import { Button, Input, Label } from "@/components/ui/primitives"
import { ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"

const fieldClassName =
  "h-12 border-white/[0.09] bg-[#101617] pl-11 text-[#edf6f2] shadow-none placeholder:text-[#66746f] hover:border-white/[0.15] focus:border-[#3bd3a7]/70 focus:ring-[#31cda1]/10"

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [show, setShow] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError("")

    if (name.trim().length < 2) {
      setError("Informe seu nome.")
      return
    }
    if (!email.includes("@")) {
      setError("Informe um e-mail válido.")
      return
    }
    if (!(password.length >= 8 && /[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(password) && /[a-záàâãéêíóôõúç]/.test(password) && /\d/.test(password) && /[^\p{L}\p{N}\s]/u.test(password))) {
      setError("Use uma senha com maiúscula, minúscula, número e caractere especial.")
      return
    }
    if (password !== confirmation) {
      setError("As senhas não coincidem.")
      return
    }

    setBusy(true)
    try {
      await register(name, email, password, confirmation)
      navigate("/", { replace: true })
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Não foi possível criar sua conta.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Crie sua conta"
      subtitle="Comece a organizar seus compromissos financeiros com privacidade."
      titleIcon={UserPlus}
    >
      <form
        onSubmit={submit}
        className="space-y-4"
        noValidate
        aria-describedby={error ? "register-error" : undefined}
      >
        {error && (
          <div
            id="register-error"
            role="alert"
            className="rounded-xl border border-[#f07a83]/25 bg-[#3c2228]/70 px-4 py-3 text-sm leading-5 text-[#ff9ca4]"
          >
            {error}
          </div>
        )}

        <AuthField label="Nome" htmlFor="name" icon={UserRound}>
          <Input
            id="name"
            autoComplete="name"
            required
            minLength={2}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Seu nome"
            className={fieldClassName}
          />
        </AuthField>

        <AuthField label="E-mail" htmlFor="email" icon={Mail}>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@exemplo.com"
            className={fieldClassName}
          />
        </AuthField>

        <AuthField label="Senha" htmlFor="password" icon={LockKeyhole}>
          <Input
            id="password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`${fieldClassName} pr-12`}
            aria-describedby="password-hint"
          />
          <button
            type="button"
            onClick={() => setShow((current) => !current)}
            aria-label={show ? "Ocultar senhas" : "Mostrar senhas"}
            aria-pressed={show}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-[#71817b] transition-colors hover:text-[#d7e4df] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#48d9b0]"
          >
            {show ? (
              <EyeOff className="h-[18px] w-[18px]" aria-hidden />
            ) : (
              <Eye className="h-[18px] w-[18px]" aria-hidden />
            )}
          </button>
        </AuthField>
        <p id="password-hint" className="-mt-2 text-xs text-[#71817b]">
          Use de 8 a 128 caracteres, com maiúscula, minúscula, número e caractere especial.
        </p>

        <AuthField label="Confirmar senha" htmlFor="confirmation" icon={LockKeyhole}>
          <Input
            id="confirmation"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            className={fieldClassName}
          />
        </AuthField>

        <Button
          type="submit"
          variant="primary"
          className="h-12 w-full bg-[linear-gradient(110deg,#16c69a,#82df4f)] text-[#03120d] shadow-[0_14px_32px_-20px_rgba(40,210,155,0.9)] transition-[filter,box-shadow,transform] hover:bg-[linear-gradient(110deg,#1bd2a3,#8be85a)] hover:shadow-[0_16px_36px_-18px_rgba(40,210,155,0.85)] hover:brightness-105 active:translate-y-px active:bg-[linear-gradient(110deg,#12ba90,#75d545)]"
          disabled={busy}
        >
          {busy ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <ArrowRight className="h-4 w-4" aria-hidden />
          )}
          {busy ? "Criando conta..." : "Criar conta"}
        </Button>

        <p className="text-center text-xs leading-5 text-[#71817b]">
          Ao criar a conta, você declara ter lido a <Link to="/privacidade" className="underline underline-offset-4 hover:text-[#b8c7c2]">Política de Privacidade</Link>. O tratamento necessário à conta ocorre para prestar o serviço, não com base em consentimento genérico.
        </p>

        <p className="pt-1 text-center text-sm text-[#8b9b95]">
          Já tem uma conta?{" "}
          <Link
            to="/login"
            state={{ showLogin: true }}
            className="font-semibold text-[#53dcb5] underline-offset-4 transition-colors hover:text-[#82e16b] hover:underline focus-visible:outline-[#53dcb5]"
          >
            Entrar
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}

function AuthField({
  label,
  htmlFor,
  icon: Icon,
  children,
}: {
  label: string
  htmlFor: string
  icon: typeof UserRound
  children: ReactNode
}) {
  return (
    <div>
      <Label htmlFor={htmlFor} className="mb-2 text-[13px] font-medium text-[#c0ccc8]">
        {label}
      </Label>
      <div className="group relative">
        <Icon
          className="pointer-events-none absolute left-4 top-6 z-10 h-[18px] w-[18px] -translate-y-1/2 text-[#71817b] transition-colors group-focus-within:text-[#43d6ad]"
          aria-hidden
        />
        {children}
      </div>
    </div>
  )
}
