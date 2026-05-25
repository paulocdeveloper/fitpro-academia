import { analyzeImageQuality, type ImageQualityReport } from "@/lib/nutrition/image-quality"

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
  const dataUrl = canvas.toDataURL("image/jpeg", 0.88)
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
