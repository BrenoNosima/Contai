import { useState } from "react"
import { cn } from "@/lib/utils"

interface BrandLogoProps {
  className?: string
  imageClassName?: string
  showTagline?: boolean
}

export function BrandLogo({ className, imageClassName, showTagline = true }: BrandLogoProps) {
  const [imageAvailable, setImageAvailable] = useState(true)

  return (
    <div className={cn("flex min-w-0 items-center", className)}>
      {imageAvailable ? (
        <img
          src="/brand/contai-logo-576.png?v=20260903"
          width={576}
          height={384}
          decoding="async"
          alt="Contaí — Entende. Organiza. Faz crescer."
          className={cn("h-auto w-36 max-w-full object-contain", imageClassName)}
          onError={() => setImageAvailable(false)}
        />
      ) : (
        <div className="flex items-center gap-2.5" aria-label="Contaí">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-primary text-primary-foreground">
            <span className="tnum text-lg font-bold">C</span>
            <span className="absolute inset-x-1 top-0 h-px bg-white/40" aria-hidden />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight text-foreground">CONTAÍ</p>
            {showTagline && <p className="text-[11px] text-subtle">Agenda financeira</p>}
          </div>
        </div>
      )}
    </div>
  )
}
