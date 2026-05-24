import type { Metadata } from "next"
import { JsonLdPage } from "@/components/seo/json-ld-page"
import { buildWebPageJsonLd } from "@/lib/seo/json-ld"
import { buildPageMetadata, publicRoutes } from "@/lib/seo/site"

const loginMeta = publicRoutes.find((r) => r.path === "/login")!

export const metadata: Metadata = buildPageMetadata({
  title: loginMeta.title,
  description: loginMeta.description,
  path: loginMeta.path,
})

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  const webPage = buildWebPageJsonLd({
    path: loginMeta.path,
    title: loginMeta.title,
    description: loginMeta.description,
  })

  return (
    <>
      <JsonLdPage data={webPage} />
      {children}
    </>
  )
}
