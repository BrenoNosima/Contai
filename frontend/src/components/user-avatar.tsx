import {
  UserRound, Cat, Dog, Rabbit, Bird, Fish, Bot, Rocket,
  Flower2, Leaf, Sun, Moon, Star, Heart, Coffee, Music,
} from "lucide-react"
import { cn } from "@/lib/utils"

export const AVATARS = [
  { id: "person", label: "Pessoa", icon: UserRound, tone: "bg-category-6/15 text-category-6" },
  { id: "cat", label: "Gato", icon: Cat, tone: "bg-category-2/15 text-category-2" },
  { id: "dog", label: "Cão", icon: Dog, tone: "bg-category-5/15 text-category-5" },
  { id: "rabbit", label: "Coelho", icon: Rabbit, tone: "bg-category-4/15 text-category-4" },
  { id: "bird", label: "Pássaro", icon: Bird, tone: "bg-category-1/15 text-category-1" },
  { id: "fish", label: "Peixe", icon: Fish, tone: "bg-category-1/15 text-category-1" },
  { id: "bot", label: "Robô", icon: Bot, tone: "bg-category-3/15 text-category-3" },
  { id: "rocket", label: "Foguete", icon: Rocket, tone: "bg-category-3/15 text-category-3" },
  { id: "flower", label: "Flor", icon: Flower2, tone: "bg-category-4/15 text-category-4" },
  { id: "leaf", label: "Folha", icon: Leaf, tone: "bg-category-5/15 text-category-5" },
  { id: "sun", label: "Sol", icon: Sun, tone: "bg-category-2/15 text-category-2" },
  { id: "moon", label: "Lua", icon: Moon, tone: "bg-category-1/15 text-category-1" },
  { id: "star", label: "Estrela", icon: Star, tone: "bg-category-2/15 text-category-2" },
  { id: "heart", label: "Coração", icon: Heart, tone: "bg-category-4/15 text-category-4" },
  { id: "coffee", label: "Café", icon: Coffee, tone: "bg-category-2/15 text-category-2" },
  { id: "music", label: "Música", icon: Music, tone: "bg-category-3/15 text-category-3" },
] as const

export type AvatarId = typeof AVATARS[number]["id"]

export function UserAvatar({ id, className, large = false }: { id?: string; className?: string; large?: boolean }) {
  const avatar = AVATARS.find((item) => item.id === id) ?? AVATARS[0]
  const Icon = avatar.icon
  return <span aria-hidden="true" className={cn("inline-flex shrink-0 items-center justify-center rounded-2xl", avatar.tone, large ? "h-16 w-16" : "h-10 w-10", className)}>
    <Icon className={large ? "h-9 w-9" : "h-5 w-5"} strokeWidth={1.8} />
  </span>
}
