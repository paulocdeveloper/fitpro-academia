import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { buildPageMetadata } from "@/lib/seo/site"

export const metadata: Metadata = buildPageMetadata({
  title: "Início",
  path: "/login",
})

export default function Home() {
  redirect("/login")
}
