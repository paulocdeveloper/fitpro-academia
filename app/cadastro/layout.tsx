import type { Metadata } from "next"
import { buildPageMetadata, publicRoutes } from "@/lib/seo/site"

const cadastroMeta = publicRoutes.find((r) => r.path === "/cadastro")!

export const metadata: Metadata = buildPageMetadata({
  title: cadastroMeta.title,
  description: cadastroMeta.description,
  path: cadastroMeta.path,
})

export default function CadastroLayout({ children }: { children: React.ReactNode }) {
  return children
}
