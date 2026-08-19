import type { LucideIcon } from "lucide-react"
import {
  UtensilsCrossed,
  Car,
  Home,
  HeartPulse,
  Gamepad2,
  Repeat,
  ShoppingBag,
  GraduationCap,
  Plane,
  Wallet,
  Briefcase,
  Gift,
  Zap,
  PiggyBank,
  Landmark,
  CircleDollarSign,
} from "lucide-react"

interface CategoryMeta {
  label: string
  icon: LucideIcon
  keywords: string[]
}

// Ordered list of known categories with pt-BR labels and matching icons.
const CATEGORIES: CategoryMeta[] = [
  { label: "Alimentação", icon: UtensilsCrossed, keywords: ["aliment", "comida", "mercado", "restaurante", "food"] },
  { label: "Transporte", icon: Car, keywords: ["transporte", "uber", "carro", "gasolina", "combust", "ônibus", "onibus"] },
  { label: "Moradia", icon: Home, keywords: ["moradia", "aluguel", "casa", "condom"] },
  { label: "Saúde", icon: HeartPulse, keywords: ["saude", "saúde", "médico", "medico", "farmácia", "farmacia", "health"] },
  { label: "Lazer", icon: Gamepad2, keywords: ["lazer", "jogo", "cinema", "entreten"] },
  { label: "Assinaturas", icon: Repeat, keywords: ["assinatura", "netflix", "spotify", "streaming"] },
  { label: "Compras", icon: ShoppingBag, keywords: ["compra", "shopping", "roupa"] },
  { label: "Educação", icon: GraduationCap, keywords: ["educa", "curso", "faculdade", "escola"] },
  { label: "Viagem", icon: Plane, keywords: ["viagem", "voo", "hotel", "trip"] },
  { label: "Salário", icon: Briefcase, keywords: ["salario", "salário", "salary", "trabalho"] },
  { label: "Presentes", icon: Gift, keywords: ["presente", "gift"] },
  { label: "Contas", icon: Zap, keywords: ["conta", "luz", "água", "agua", "internet", "energia"] },
  { label: "Investimentos", icon: PiggyBank, keywords: ["invest", "poupança", "poupanca"] },
  { label: "Impostos", icon: Landmark, keywords: ["imposto", "taxa", "tributo"] },
  { label: "Renda extra", icon: Wallet, keywords: ["renda", "freela", "extra", "bônus", "bonus"] },
]

const FALLBACK: CategoryMeta = { label: "Outros", icon: CircleDollarSign, keywords: [] }

export function categoryMeta(category: string): CategoryMeta {
  const c = (category || "").toLowerCase().trim()
  const exact = CATEGORIES.find((m) => m.label.toLowerCase() === c)
  if (exact) return exact
  const fuzzy = CATEGORIES.find((m) => m.keywords.some((k) => c.includes(k)))
  return fuzzy ?? { ...FALLBACK, label: category || "Outros" }
}

export function categoryIcon(category: string): LucideIcon {
  return categoryMeta(category).icon
}

/** Suggested categories for select inputs. */
export const CATEGORY_SUGGESTIONS = CATEGORIES.map((c) => c.label)
