import type { Metadata } from "next"
import { JsonLdPage } from "@/components/seo/json-ld-page"
import { buildWebPageJsonLd } from "@/lib/seo/json-ld"
import { buildPageMetadata, publicRoutes } from "@/lib/seo/site"

const meta = publicRoutes.find((r) => r.path === "/cadastro-fitness")!

export const metadata: Metadata = buildPageMetadata({
  title: meta.title,
  description: meta.description,
  path: meta.path,
})

export default function CadastroFitnessLayout({ children }: { children: React.ReactNode }) {
  const webPage = buildWebPageJsonLd({
    path: meta.path,
    title: meta.title,
    description: meta.description,
  })

  return (
    <>
      <JsonLdPage data={webPage} />
      {children}
    </>
  )
}
