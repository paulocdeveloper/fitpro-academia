import type { Metadata } from "next"
import { JsonLdPage } from "@/components/seo/json-ld-page"
import { buildWebPageJsonLd } from "@/lib/seo/json-ld"
import { buildPageMetadata, publicRoutes } from "@/lib/seo/site"

const cadastroMeta = publicRoutes.find((r) => r.path === "/cadastro")!

export const metadata: Metadata = buildPageMetadata({
  title: cadastroMeta.title,
  description: cadastroMeta.description,
  path: cadastroMeta.path,
})

export default function CadastroLayout({ children }: { children: React.ReactNode }) {
  const webPage = buildWebPageJsonLd({
    path: cadastroMeta.path,
    title: cadastroMeta.title,
    description: cadastroMeta.description,
  })

  return (
    <>
      <JsonLdPage data={webPage} />
      {children}
    </>
  )
}
