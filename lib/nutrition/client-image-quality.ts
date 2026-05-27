import { analyzeImageQuality, type ImageQualityReport } from "@/lib/nutrition/image-quality"

function estimateBase64Bytes(dataUrl: string): number {
  const trimmed = dataUrl.trim()
  const comma = trimmed.indexOf(",")
  const base64 = comma >= 0 ? trimmed.slice(comma + 1) : trimmed
  return Math.floor((base64.length * 3) / 4)
}

function encodeJpegUnderLimit(canvas: HTMLCanvasElement, maxBytes: number) {
  const qualities = [0.88, 0.84, 0.8, 0.76, 0.72, 0.68]
  let best = canvas.toDataURL("image/jpeg", qualities[0])
  for (const q of qualities) {
    const dataUrl = q === qualities[0] ? best : canvas.toDataURL("image/jpeg", q)
    best = dataUrl
    if (estimateBase64Bytes(dataUrl) <= maxBytes) return dataUrl
  }
  return best
}

export function captureFrameQuality(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): { report: ImageQualityReport; dataUrl: string; pixels: number[] } | null {
  const w = video.videoWidth
  const h = video.videoHeight
  if (!w || !h) return null

  // 1536px + JPEG 0.88 — bom equilíbrio qualidade/tamanho no Safari iPhone
  const maxW = 1536
  const scale = Math.min(1, maxW / w)
  const cw = Math.round(w * scale)
  const ch = Math.round(h * scale)
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return null
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(video, 0, 0, cw, ch)
  const imageData = ctx.getImageData(0, 0, cw, ch)
  const report = analyzeImageQuality(imageData.data, cw, ch)
  // Mantém margem abaixo do limite típico do Vision (4MB) para reduzir falhas e custo.
  const dataUrl = encodeJpegUnderLimit(canvas, 3.2 * 1024 * 1024)
  return { report, dataUrl, pixels: Array.from(imageData.data) }
}

/** Compara frames consecutivos para estabilização (0 = instável, 1 = estável). */
export function frameStabilityScore(
  prev: Uint8ClampedArray,
  curr: Uint8ClampedArray,
): number {
  const step = 16
  let diff = 0
  let n = 0
  for (let i = 0; i < Math.min(prev.length, curr.length); i += 4 * step) {
    diff += Math.abs(prev[i] - curr[i]) + Math.abs(prev[i + 1] - curr[i + 1]) + Math.abs(prev[i + 2] - curr[i + 2])
    n++
  }
  const avgDiff = diff / Math.max(n, 1)
  if (avgDiff < 8) return 1
  if (avgDiff < 18) return 0.7
  if (avgDiff < 35) return 0.4
  return 0.1
}
