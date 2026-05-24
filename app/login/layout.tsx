import type { Metadata } from "next"
import { buildPageMetadata, publicRoutes } from "@/lib/seo/site"

const loginMeta = publicRoutes.find((r) => r.path === "/login")!

export const metadata: Metadata = buildPageMetadata({
  title: loginMeta.title,
  description: loginMeta.description,
  path: loginMeta.path,
})

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
