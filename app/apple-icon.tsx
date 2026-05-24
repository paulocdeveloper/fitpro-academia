import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
          borderRadius: 40,
          fontSize: 96,
          fontWeight: 800,
          color: "#052e16",
        }}
      >
        F
      </div>
    ),
    { ...size },
  )
}
