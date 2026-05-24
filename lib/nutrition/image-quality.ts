export type ImageQualityReport = {
  ok: boolean
  score: number
  issues: string[]
  width: number
  height: number
  brightness: number
  sharpness: number
}

/** Analisa nitidez e exposição a partir de pixels RGBA (determinístico). */
export function analyzeImageQuality(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): ImageQualityReport {
  const issues: string[] = []
  if (width < 320 || height < 240) {
    issues.push("Resolução muito baixa — aproxime a câmera do prato.")
  }

  let brightnessSum = 0
  let laplacianSum = 0
  const n = width * height

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4
      const r = pixels[idx]
      const g = pixels[idx + 1]
      const b = pixels[idx + 2]
      brightnessSum += (r + g + b) / 3

      const idxUp = ((y - 1) * width + x) * 4
      const idxDown = ((y + 1) * width + x) * 4
      const idxLeft = (y * width + (x - 1)) * 4
      const idxRight = (y * width + (x + 1)) * 4
      const gray =
        (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3
      const neighbors =
        (pixels[idxUp] + pixels[idxUp + 1] + pixels[idxUp + 2]) / 3 +
        (pixels[idxDown] + pixels[idxDown + 1] + pixels[idxDown + 2]) / 3 +
        (pixels[idxLeft] + pixels[idxLeft + 1] + pixels[idxLeft + 2]) / 3 +
        (pixels[idxRight] + pixels[idxRight + 1] + pixels[idxRight + 2]) / 3
      laplacianSum += Math.abs(4 * gray - neighbors)
    }
  }

  const brightness = brightnessSum / Math.max(n, 1)
  const sharpness = laplacianSum / Math.max(n, 1)

  if (brightness < 45) issues.push("Imagem escura — melhore a iluminação.")
  if (brightness > 220) issues.push("Imagem estourada — reduza luz direta.")
  if (sharpness < 8) issues.push("Imagem borrada — segure firme e aguarde o foco.")

  let score = 100
  if (brightness < 45 || brightness > 220) score -= 25
  if (sharpness < 8) score -= 35
  if (sharpness < 15) score -= 15
  if (width < 480) score -= 10

  score = Math.max(0, Math.min(100, score))
  const ok = score >= 50 && issues.length <= 1

  return { ok, score, issues, width, height, brightness, sharpness }
}

export function decodeBase64ToPixels(base64: string): {
  pixels: Uint8ClampedArray
  width: number
  height: number
} | null {
  try {
    const raw = base64.replace(/^data:image\/\w+;base64,/, "")
    const buf = Buffer.from(raw, "base64")
    // PNG/JPEG decode no Node without sharp — use simplified station for dimensions via minimal parse
    // For server we'll rely on client sending quality metrics + OpenAI reads image directly
    return null
  } catch {
    return null
  }
}
