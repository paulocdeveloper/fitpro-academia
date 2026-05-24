import type { LucideIcon } from "lucide-react"
import { Crown, Star, Zap } from "lucide-react"

export type PlanoSlug = "basico" | "premium" | "vip"

export type PlanoMeta = {
  slug: PlanoSlug
  nome: string
  descricao: string
  duracao: string
  icon: LucideIcon
  color: string
  destaque?: boolean
  features: string[]
  valorPadrao: number
}

export const PLANOS_META: PlanoMeta[] = [
  {
    slug: "basico",
    nome: "Básico",
    valorPadrao: 89.9,
    duracao: "Mensal",
    descricao: "Ideal para quem está começando",
    icon: Zap,
    color: "oklch(0.65 0.2 200)",
    features: [
      "Acesso à academia",
      "Treino personalizado",
      "Acompanhamento básico",
      "App mobile",
    ],
  },
  {
    slug: "premium",
    nome: "Premium",
    valorPadrao: 189.9,
    duracao: "Mensal",
    descricao: "O mais popular entre os alunos",
    icon: Star,
    color: "oklch(0.7 0.22 145)",
    destaque: true,
    features: [
      "Acesso à academia",
      "Treino personalizado",
      "Acompanhamento semanal",
      "Plano nutricional",
      "App mobile",
      "Avaliação física mensal",
    ],
  },
  {
    slug: "vip",
    nome: "VIP",
    valorPadrao: 299.9,
    duracao: "Mensal",
    descricao: "Experiência completa e exclusiva",
    icon: Crown,
    color: "oklch(0.75 0.18 80)",
    features: [
      "Acesso ilimitado",
      "Treino 100% personalizado",
      "Acompanhamento diário",
      "Plano nutricional completo",
      "App mobile premium",
      "Avaliação física quinzenal",
      "Personal exclusivo",
      "Acesso prioritário",
    ],
  },
]

export const PLANOS_META_BY_SLUG = Object.fromEntries(
  PLANOS_META.map((m) => [m.slug, m]),
) as Record<PlanoSlug, PlanoMeta>
