/** Extrai base64 puro de data URL (Safari/iPhone). */
export function stripDataUrl(dataUrl: string): string {
  const trimmed = dataUrl.trim()
  const comma = trimmed.indexOf(",")
  if (comma >= 0) return trimmed.slice(comma + 1)
  return trimmed
}

/** Garante data URL JPEG para OpenAI Vision. */
export function toVisionDataUrl(image: string): string {
  const trimmed = image.trim()
  if (trimmed.startsWith("data:")) return trimmed
  return `data:image/jpeg;base64,${trimmed}`
}

/** Tamanho aproximado do payload em bytes (base64). */
export function estimateBase64Bytes(base64: string): number {
  const len = stripDataUrl(base64).length
  return Math.floor((len * 3) / 4)
}

const MAX_VISION_BYTES = 4 * 1024 * 1024

export function assertVisionImageSize(image: string): string | null {
  const bytes = estimateBase64Bytes(image)
  if (bytes > MAX_VISION_BYTES) {
    return `Imagem muito grande (${Math.round(bytes / 1024 / 1024)} MB). Recapture mais perto do prato.`
  }
  return null
}
