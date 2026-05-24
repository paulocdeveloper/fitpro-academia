import type { Metadata } from "next"

/** URL canônica (produção). Defina NEXT_PUBLIC_SITE_URL no Render. */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://fitpro-academia.onrender.com")
).replace(/\/$/, "")

export const siteName = "FitPro Academia"

export const siteTagline = "Gestão inteligente para academias e personal trainers"

/** Descrição oficial para Google, OG e redes sociais */
export const brandDescription =
  "Sistema inteligente de gestão para academias, alunos, treinos, pagamentos e acompanhamento fitness."

export const defaultDescription =
  `${siteName}: ${brandDescription} Controle alunos, planos, financeiro e nutrição em um painel na nuvem.`

export const defaultKeywords = [
  "fitpro academia",
  "gestão de academia",
  "software para academia",
  "sistema para personal trainer",
  "controle de alunos",
  "treinos personalizados",
  "pagamentos academia",
  "acompanhamento fitness",
  "financeiro academia",
  "SaaS academia",
  "app gestão fitness",
  "academia Brasil",
]

/** Imagem social (WhatsApp, Facebook, Instagram, Twitter) */
export const ogImagePath = "/opengraph-image"
export const ogImageAlt = `${siteName} — ${brandDescription}`

export const publicRoutes: {
  path: string
  title: string
  description: string
  priority: number
  changeFrequency: "weekly" | "monthly"
}[] = [
  {
    path: "/login",
    title: "Entrar",
    description:
      "Acesse o painel FitPro Academia. Gestão de alunos, treinos, pagamentos e acompanhamento fitness em um só lugar.",
    priority: 1,
    changeFrequency: "weekly",
  },
  {
    path: "/cadastro",
    title: "Cadastrar academia",
    description:
      "Crie sua conta no FitPro Academia. Registre sua academia e comece a gerenciar alunos, treinos e pagamentos online.",
    priority: 0.9,
    changeFrequency: "weekly",
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
  "/_next",
]

export const googleSiteVerification =
  process.env.GOOGLE_SITE_VERIFICATION?.trim() ||
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() ||
  undefined

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

function socialImages() {
  return [
    {
      url: ogImagePath,
      width: 1200,
      height: 630,
      alt: ogImageAlt,
      type: "image/png",
    },
  ]
}

export function buildPageMetadata(input: PageMetaInput): Metadata {
  const description = input.description ?? defaultDescription
  const url = `${siteUrl}${input.path}`
  const indexable = !input.noIndex
  const fullTitle = pageTitle(input.title)

  return {
    title: input.title,
    description,
    keywords: input.keywords ?? defaultKeywords,
    alternates: { canonical: url },
    robots: indexable
      ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } }
      : { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      url,
      siteName,
      title,
      description,
      images: socialImages(),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImagePath],
    },
  }
}

export const privateRobots: Metadata["robots"] = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: { index: false, follow: false, noimageindex: true },
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
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: `${siteUrl}/login`,
    languages: { "pt-BR": `${siteUrl}/login` },
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
    images: socialImages(),
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} — ${siteTagline}`,
    description: defaultDescription,
    images: [ogImagePath],
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/icon.svg"],
  },
  manifest: "/manifest.webmanifest",
  verification: googleSiteVerification ? { google: googleSiteVerification } : undefined,
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": siteName,
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
}
