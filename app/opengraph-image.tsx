import { ImageResponse } from "next/og"
import { siteName, siteTagline } from "@/lib/seo/site"

export const runtime = "edge"
export const alt = `${siteName} — ${siteTagline}`
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "72px",
          background: "#0a0a12",
          color: "#f8fafc",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <span style={{ fontSize: 40, fontWeight: 700, marginBottom: 16 }}>{siteName}</span>
        <span style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.2, maxWidth: 900 }}>{siteTagline}</span>
        <span style={{ fontSize: 24, color: "#94a3b8", marginTop: 24, maxWidth: 800 }}>
          Alunos, treinos, planos, financeiro e nutricao em um painel na nuvem.
        </span>
      </div>
    ),
    { ...size },
  )
}
