import type { Metadata } from "next"

/** URL canônica do site (produção). Sobrescreva com NEXT_PUBLIC_SITE_URL no Render. */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://fitpro-academia.onrender.com")
).replace(/\/$/, "")

export const siteName = "FitPro Academia"

export const siteTagline = "Gestão inteligente para academias e personal trainers"

export const defaultDescription =
  "FitPro Academia é o sistema completo para gerenciar alunos, treinos, planos, financeiro e nutrição. " +
  "Controle sua academia com precisão, relatórios e painel multi-tenant em nuvem."

export const defaultKeywords = [
  "fitpro academia",
  "gestão de academia",
  "software para academia",
  "sistema para personal trainer",
  "controle de alunos academia",
  "treinos personalizados",
  "financeiro academia",
  "SaaS academia",
  "app gestão fitness",
  "academia Brasil",
]

/** Rotas públicas indexáveis (URLs amigáveis). */
export const publicRoutes: { path: string; title: string; description: string; priority: number }[] = [
  {
    path: "/login",
    title: "Entrar",
    description:
      "Acesse o painel FitPro Academia. Gerencie alunos, treinos, planos e financeiro da sua academia em um só lugar.",
    priority: 1,
  },
  {
    path: "/cadastro",
    title: "Cadastrar academia",
    description:
      "Crie sua conta no FitPro Academia. Registre sua academia e comece a gerenciar alunos, treinos e pagamentos online.",
    priority: 0.9,
  },
]

export const privatePathPrefixes = [
  "/dashboard",
  "/alunos",
  "/treinos",
  "/exercicios",
  "/planos",
  "/dietas",
  "/agenda",
  "/financeiro",
  "/estoque",
  "/configuracoes",
  "/api",
]

type PageMetaInput = {
  title: string
  description?: string
  path: string
  keywords?: string[]
  noIndex?: boolean
}

export function pageTitle(title: string) {
  return `${title} | ${siteName}`
}

export function buildPageMetadata(input: PageMetaInput): Metadata {
  const description = input.description ?? defaultDescription
  const url = `${siteUrl}${input.path}`
  const indexable = !input.noIndex

  return {
    title: pageTitle(input.title),
    description,
    keywords: input.keywords ?? defaultKeywords,
    alternates: { canonical: url },
    robots: indexable
      ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } }
      : { index: false, follow: false, googleBot: { index: false, follow: false } },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      url,
      siteName,
      title: pageTitle(input.title),
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle(input.title),
      description,
    },
  }
}

export const rootMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} — ${siteTagline}`,
    template: `%s | ${siteName}`,
  },
  description: defaultDescription,
  keywords: defaultKeywords,
  applicationName: siteName,
  authors: [{ name: siteName, url: siteUrl }],
  creator: siteName,
  publisher: siteName,
  category: "business",
  alternates: {
    canonical: siteUrl,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName,
    title: `${siteName} — ${siteTagline}`,
    description: defaultDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} — ${siteTagline}`,
    description: defaultDescription,
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: ["/icon.svg"],
  },
  manifest: "/manifest.webmanifest",
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
      : undefined,
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": siteName,
  },
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteName,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: siteUrl,
    description: defaultDescription,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "BRL",
    },
    inLanguage: "pt-BR",
  }
}
