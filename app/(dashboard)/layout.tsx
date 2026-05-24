import type { Metadata } from "next"
import { Sidebar } from "@/components/layout/sidebar"
import { privateRobots } from "@/lib/seo/site"

export const metadata: Metadata = {
  robots: privateRobots,
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 ml-64 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  )
}
