/** Retry com backoff para OpenAI (429, 5xx, timeout). */
export async function fetchOpenAIWithRetry(
  url: string,
  init: RequestInit,
  options?: { maxAttempts?: number; baseMs?: number },
): Promise<Response> {
  const maxAttempts = options?.maxAttempts ?? 3
  const baseMs = options?.baseMs ?? 800
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, init)
      if (res.ok || (res.status !== 429 && res.status < 500)) {
        return res
      }
      const retryAfter = res.headers.get("retry-after")
      const wait = retryAfter ? Number(retryAfter) * 1000 : baseMs * attempt
      if (attempt < maxAttempts) {
        await sleep(Number.isFinite(wait) ? wait : baseMs * attempt)
        continue
      }
      return res
    } catch (e) {
      lastError = e
      if (attempt < maxAttempts) {
        await sleep(baseMs * attempt)
        continue
      }
      throw e
    }
  }
  throw lastError ?? new Error("OpenAI fetch failed")
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
