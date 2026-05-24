import type { Metadata } from "next"
import { cookies } from "next/headers"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { privateRobots } from "@/lib/seo/site"

export const metadata: Metadata = {
  robots: privateRobots,
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const sidebarState = cookieStore.get("sidebar_state")?.value
  const defaultOpen = sidebarState !== "false"

  return <DashboardShell defaultOpen={defaultOpen}>{children}</DashboardShell>
}
