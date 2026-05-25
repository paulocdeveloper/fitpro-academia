export type CameraFacing = "environment" | "user"

export type CameraPermissionState = "unsupported" | "insecure" | "prompt" | "granted" | "denied" | "unknown"

export function isPermissionDeniedError(e: unknown): boolean {
  const name = (e as { name?: string })?.name ?? ""
  return name === "NotAllowedError" || name === "PermissionDeniedError"
}

export type CameraAccessErrorKind =
  | "unsupported"
  | "insecure"
  | "denied"
  | "not_found"
  | "busy"
  | "constraint"
  | "gesture"
  | "play_blocked"
  | "stream_inactive"
  | "unknown"

export type CameraAccessFailure = {
  kind: CameraAccessErrorKind
  message: string
  rawName?: string
  rawMessage?: string
}

const GET_USER_MEDIA_TIMEOUT_MS = 20_000
const RETRY_ROUNDS = 2
const RETRY_DELAY_MS = 400

export function logCamera(step: string, data?: Record<string, unknown>) {
  if (typeof console === "undefined") return
  console.info(`[camera:${step}]`, data ?? {})
}

/** Log completo do erro DOM (visível no console do Brave/Chrome). */
export function logCameraError(step: string, e: unknown, extra?: Record<string, unknown>) {
  const err = e as DOMException & { constraint?: string }
  const payload = {
    name: err?.name ?? "unknown",
    message: err?.message ?? String(e),
    constraint: err?.constraint,
    ...extra,
  }
  console.error(`[camera:${step}]`, payload)
  logCamera(step, payload)
}

function isSecureCameraContext(): boolean {
  if (typeof window === "undefined") return false
  const host = window.location.hostname
  const okHost = host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1"
  return window.isSecureContext || okHost
}

export function isGetUserMediaSupported(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia)
}

export function isStreamLive(stream: MediaStream | null | undefined): boolean {
  if (!stream) return false
  const tracks = stream.getTracks()
  const video = tracks.find((t) => t.kind === "video") ?? stream.getVideoTracks()[0]
  return Boolean(video && video.readyState === "live" && video.enabled)
}

export function stopMediaStream(stream: MediaStream | null | undefined): void {
  if (!stream) return
  for (const track of stream.getTracks()) {
    track.stop()
    logCamera("track-stopped", { kind: track.kind, label: track.label, readyState: track.readyState })
  }
}

export async function releaseCameraHardware(stream?: MediaStream | null): Promise<void> {
  stopMediaStream(stream ?? null)
  await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
}

export async function queryCameraPermission(): Promise<CameraPermissionState> {
  if (!isGetUserMediaSupported()) return "unsupported"
  if (!isSecureCameraContext()) return "insecure"

  const perms = navigator.permissions
  if (!perms?.query) return "unknown"

  try {
    const result = await perms.query({ name: "camera" as PermissionName })
    logCamera("permission-query", { state: result.state })
    if (result.state === "granted") return "granted"
    if (result.state === "denied") return "denied"
    return "prompt"
  } catch (e) {
    logCameraError("permission-query-error", e)
    return "unknown"
  }
}

async function warmUpDevices(): Promise<MediaDeviceInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const cameras = devices.filter((d) => d.kind === "videoinput")
    logCamera("enumerate-devices", {
      total: devices.length,
      cameras: cameras.map((c) => ({ id: c.deviceId?.slice(0, 12), label: c.label })),
    })
    return cameras
  } catch (e) {
    logCameraError("enumerate-devices-error", e)
    return []
  }
}

function classifyMediaError(e: unknown): CameraAccessFailure {
  const err = e as DOMException & { constraint?: string }
  const name = err?.name ?? ""
  const msg = err?.message ?? ""

  if (isPermissionDeniedError(e)) {
    return {
      kind: "denied",
      rawName: name,
      rawMessage: msg,
      message: "Acesso à câmera recusado. Verifique o ícone de câmera na barra de endereço e tente de novo.",
    }
  }
  if (name === "SecurityError") {
    return {
      kind: "gesture",
      rawName: name,
      rawMessage: msg,
      message: "Toque em “Permitir câmera” para autorizar o acesso.",
    }
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return {
      kind: "not_found",
      rawName: name,
      rawMessage: msg,
      message: "Nenhuma câmera encontrada. Conecte uma webcam ou use o celular.",
    }
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return {
      kind: "busy",
      rawName: name,
      rawMessage: msg,
      message: "Câmera ocupada por outro app. Feche outros programas e tente novamente.",
    }
  }
  if (name === "AbortError") {
    return {
      kind: "busy",
      rawName: name,
      rawMessage: msg,
      message: "Abertura da câmera cancelada. Tente novamente.",
    }
  }
  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
    return {
      kind: "constraint",
      rawName: name,
      rawMessage: msg,
      message: `Configuração incompatível${err.constraint ? ` (${err.constraint})` : ""}. Tentando outra…`,
    }
  }

  return {
    kind: "unknown",
    rawName: name,
    rawMessage: msg,
    message: msg ? `Falha na câmera: ${msg}` : "Falha ao abrir a câmera.",
  }
}

/** Sem facingMode — máxima compatibilidade Brave/Safari/Chrome. */
function buildConstraintAttempts(): { label: string; constraints: MediaStreamConstraints }[] {
  return [
    { label: "video-true", constraints: { video: true } },
    {
      label: "ideal-hd",
      constraints: { video: { width: { ideal: 1280 }, height: { ideal: 720 } } },
    },
    {
      label: "ideal-sd",
      constraints: { video: { width: { ideal: 640 }, height: { ideal: 480 } } },
    },
    {
      label: "min-vga",
      constraints: {
        video: {
          width: { min: 320, ideal: 640 },
          height: { min: 240, ideal: 480 },
        },
      },
    },
  ]
}

function getUserMediaWithTimeout(constraints: MediaStreamConstraints): Promise<MediaStream> {
  const md = navigator.mediaDevices
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new DOMException("Timeout ao abrir câmera", "AbortError"))
    }, GET_USER_MEDIA_TIMEOUT_MS)
    md.getUserMedia(constraints)
      .then((stream) => {
        window.clearTimeout(timer)
        resolve(stream)
      })
      .catch((e) => {
        window.clearTimeout(timer)
        reject(e)
      })
  })
}

/** facingMode só via applyConstraints — nunca bloqueia o stream. */
async function tryPreferFacing(stream: MediaStream, facing: CameraFacing): Promise<void> {
  const track = stream.getVideoTracks()[0]
  if (!track) return
  try {
    await track.applyConstraints({ facingMode: { ideal: facing } })
    logCamera("facing-applied", { facing, label: track.label })
  } catch (e) {
    logCameraError("facing-skip", e, { facing, note: "stream mantido sem facing" })
  }
}

async function tryOpenStream(
  label: string,
  constraints: MediaStreamConstraints,
): Promise<{ stream: MediaStream } | { failure: CameraAccessFailure }> {
  try {
    logCamera("getUserMedia-attempt", { label, constraints: JSON.stringify(constraints) })
    const stream = await getUserMediaWithTimeout(constraints)
    const tracks = stream.getTracks()
    logCamera("stream-created", {
      label,
      trackCount: tracks.length,
      tracks: tracks.map((t) => ({
        kind: t.kind,
        label: t.label,
        readyState: t.readyState,
        enabled: t.enabled,
        muted: t.muted,
      })),
    })
    return { stream }
  } catch (e) {
    const failure = classifyMediaError(e)
    logCameraError("getUserMedia-error", e, { label, kind: failure.kind })
    return { failure }
  }
}

/**
 * Abre câmera com fallbacks + retry + deviceId.
 * Nunca usa facingMode no getUserMedia (apenas ideal depois).
 */
export async function requestCameraStream(
  facing: CameraFacing = "environment",
): Promise<MediaStream> {
  if (!isGetUserMediaSupported()) {
    throw { kind: "unsupported", message: "Navegador sem suporte a câmera." } satisfies CameraAccessFailure
  }
  if (!isSecureCameraContext()) {
    throw { kind: "insecure", message: "Câmera requer HTTPS (Render) ou localhost." } satisfies CameraAccessFailure
  }

  logCamera("getUserMedia-start", { facing, ua: typeof navigator !== "undefined" ? navigator.userAgent : "" })
  await warmUpDevices()

  const attempts = buildConstraintAttempts()
  let lastFailure: CameraAccessFailure = { kind: "unknown", message: "Não foi possível iniciar a câmera." }
  let sawDenied = false
  let sawOther = false

  const handleResult = (result: { stream: MediaStream } | { failure: CameraAccessFailure }) => {
    if ("stream" in result) return result.stream
    lastFailure = result.failure
    if (result.failure.kind === "denied") sawDenied = true
    else sawOther = true
    return null
  }

  for (let round = 0; round < RETRY_ROUNDS; round++) {
    if (round > 0) {
      logCamera("retry-round", { round })
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
    }

    for (const { label, constraints } of attempts) {
      const stream = handleResult(await tryOpenStream(label, constraints))
      if (stream && isStreamLive(stream)) {
        await tryPreferFacing(stream, facing)
        return stream
      }
    }

    const cameras = await warmUpDevices()
    for (const cam of cameras) {
      if (!cam.deviceId) continue
      const stream = handleResult(
        await tryOpenStream(`device-${cam.deviceId.slice(0, 8)}`, {
          video: { deviceId: { ideal: cam.deviceId } },
        }),
      )
      if (stream && isStreamLive(stream)) {
        await tryPreferFacing(stream, facing)
        return stream
      }
    }
  }

  if (sawDenied && !sawOther) {
    throw {
      kind: "denied",
      rawName: lastFailure.rawName,
      rawMessage: lastFailure.rawMessage,
      message: lastFailure.message,
    } satisfies CameraAccessFailure
  }

  throw {
    ...lastFailure,
    message: lastFailure.rawMessage
      ? `${lastFailure.message} (${lastFailure.rawName}: ${lastFailure.rawMessage})`
      : lastFailure.message,
  }
}

export async function applyContinuousFocus(stream: MediaStream): Promise<void> {
  const track = stream.getVideoTracks()[0]
  if (!track) return
  try {
    await track.applyConstraints({
      advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
    })
  } catch (e) {
    logCameraError("focus-skip", e)
  }
}

export type AttachVideoResult =
  | { ok: true }
  | { ok: false; failure: CameraAccessFailure }

export async function attachStreamToVideo(
  stream: MediaStream,
  video: HTMLVideoElement,
  timeoutMs = 10_000,
): Promise<AttachVideoResult> {
  const tracks = stream.getTracks()
  logCamera("attach-start", {
    tracks: tracks.map((t) => ({ kind: t.kind, readyState: t.readyState })),
  })

  if (!isStreamLive(stream)) {
    return {
      ok: false,
      failure: {
        kind: "stream_inactive",
        message: "Stream inativo. Toque em “Permitir câmera” novamente.",
      },
    }
  }

  video.srcObject = null
  video.srcObject = stream
  video.muted = true
  video.defaultMuted = true
  video.autoplay = true
  video.playsInline = true
  video.setAttribute("playsinline", "true")
  video.setAttribute("webkit-playsinline", "true")

  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("metadata-timeout")), timeoutMs)
    const onReady = () => {
      window.clearTimeout(timer)
      video.removeEventListener("loadedmetadata", onReady)
      resolve()
    }
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      window.clearTimeout(timer)
      resolve()
    } else {
      video.addEventListener("loadedmetadata", onReady, { once: true })
    }
  }).catch((e) => {
    logCameraError("video-metadata-timeout", e)
    throw e
  })

  logCamera("video-metadata", {
    readyState: video.readyState,
    videoWidth: video.videoWidth,
    videoHeight: video.videoHeight,
  })

  try {
    await video.play()
    logCamera("video-play-ok", { paused: video.paused, readyState: video.readyState })
    return { ok: true }
  } catch (e) {
    logCameraError("video-play-fail", e)
    const err = e as DOMException
    if (err?.name === "NotAllowedError") {
      return {
        ok: false,
        failure: {
          kind: "play_blocked",
          rawName: err.name,
          rawMessage: err.message,
          message: "Toque na tela para iniciar o preview do vídeo.",
        },
      }
    }
    return {
      ok: false,
      failure: {
        kind: "unknown",
        rawName: err?.name,
        rawMessage: err?.message,
        message: err?.message ? `Preview: ${err.message}` : "Preview não iniciou.",
      },
    }
  }
}

export function mapFailureToCameraPhase(
  failure: CameraAccessFailure,
): "denied" | "failed" | "unsupported" {
  if (failure.kind === "denied") return "denied"
  if (failure.kind === "unsupported" || failure.kind === "insecure") return "unsupported"
  return "failed"
}
