import { ImageResponse } from "next/og"
import { brandDescription, siteName, siteTagline } from "@/lib/seo/site"

export const runtime = "edge"
export const alt = `${siteName} — ${brandDescription}`
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(145deg, #06060c 0%, #0f1419 45%, #0a1f14 100%)",
          color: "#f8fafc",
          fontFamily: "system-ui, Segoe UI, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              fontWeight: 800,
              color: "#052e16",
            }}
          >
            F
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 42, fontWeight: 800 }}>{siteName}</span>
            <span style={{ fontSize: 22, color: "#86efac", marginTop: 4 }}>{siteTagline}</span>
          </div>
        </div>
        <p style={{ fontSize: 36, fontWeight: 600, lineHeight: 1.35, maxWidth: 1000, margin: 0 }}>
          {brandDescription}
        </p>
      </div>
    ),
    { ...size },
  )
}
