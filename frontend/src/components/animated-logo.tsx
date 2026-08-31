import { BrandLogo } from "@/components/brand-logo"
import { cn } from "@/lib/utils"

interface AnimatedLogoProps {
  className?: string
  imageClassName?: string
}

export function AnimatedLogo({ className, imageClassName }: AnimatedLogoProps) {
  return (
    <div className={cn("animated-logo", className)}>
      <span className="animated-logo__glow" aria-hidden />
      <BrandLogo
        className="relative justify-center"
        imageClassName={cn("w-32 mix-blend-screen sm:w-36", imageClassName)}
      />
    </div>
  )
}
