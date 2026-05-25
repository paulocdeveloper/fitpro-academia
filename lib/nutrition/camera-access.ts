export type CameraFacing = "environment" | "user"

export type CameraPermissionState = "unsupported" | "insecure" | "prompt" | "granted" | "denied" | "unknown"

/** Apenas erros DOM que significam bloqueio explícito de permissão. */
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
}

export function logCamera(step: string, data?: Record<string, unknown>) {
  if (typeof console === "undefined") return
  console.info(`[camera:${step}]`, data ?? {})
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
  const track = stream.getVideoTracks()[0]
  return Boolean(track && track.readyState === "live" && track.enabled && !track.muted)
}

/** Consulta Permissions API (não confundir com sucesso do getUserMedia). */
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
    logCamera("permission-query-error", { message: e instanceof Error ? e.message : String(e) })
    return "unknown"
  }
}

function classifyMediaError(e: unknown): CameraAccessFailure {
  const err = e as { name?: string; message?: string }
  const name = typeof err?.name === "string" ? err.name : ""
  const msg = typeof err?.message === "string" ? err.message : ""

  if (isPermissionDeniedError(e)) {
    return {
      kind: "denied",
      rawName: name,
      message: "O navegador bloqueou a câmera. Clique em “Permitir câmera” e aceite no pop-up.",
    }
  }

  if (name === "SecurityError") {
    return {
      kind: "gesture",
      rawName: name,
      message: "Toque em “Permitir câmera” para o navegador abrir o pedido de acesso.",
    }
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return { kind: "not_found", rawName: name, message: "Nenhuma webcam/câmera encontrada no dispositivo." }
  }
  if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") {
    return {
      kind: "busy",
      rawName: name,
      message: "Câmera em uso por outro app. Feche outros programas e tente novamente.",
    }
  }
  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
    return {
      kind: "constraint",
      rawName: name,
      message: "Configuração de câmera incompatível — tentando alternativa…",
    }
  }

  return {
    kind: "unknown",
    rawName: name,
    message: msg ? `Falha ao abrir câmera (${msg}).` : "Falha ao abrir a câmera.",
  }
}

function buildConstraintAttempts(facing: CameraFacing): MediaStreamConstraints[] {
  return [
    { audio: false, video: true },
    { audio: false, video: { facingMode: { ideal: facing } } },
    { audio: false, video: { facingMode: facing } },
    {
      audio: false,
      video: {
        facingMode: { ideal: facing },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    },
    ...(facing === "environment"
      ? [{ audio: false, video: { facingMode: { ideal: "user" } } }]
      : []),
  ]
}

/**
 * Solicita stream — chamar no onClick do usuário.
 * Não interrompe em NotAllowed na 1ª tentativa se outras constraints podem funcionar.
 */
export async function requestCameraStream(
  facing: CameraFacing = "environment",
): Promise<MediaStream> {
  if (!isGetUserMediaSupported()) {
    throw { kind: "unsupported" as const, message: "Navegador sem suporte a câmera." } satisfies CameraAccessFailure
  }
  if (!isSecureCameraContext()) {
    throw { kind: "insecure" as const, message: "Câmera requer HTTPS (Render) ou localhost." } satisfies CameraAccessFailure
  }

  logCamera("getUserMedia-start", { facing })
  const attempts = buildConstraintAttempts(facing)
  let lastFailure: CameraAccessFailure | null = null
  let deniedCount = 0

  for (let i = 0; i < attempts.length; i++) {
    const constraints = attempts[i]
    try {
      logCamera("getUserMedia-attempt", { index: i, constraints: JSON.stringify(constraints) })
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      const track = stream.getVideoTracks()[0]
      logCamera("stream-created", {
        trackId: track?.id,
        label: track?.label,
        readyState: track?.readyState,
        live: isStreamLive(stream),
      })
      return stream
    } catch (e) {
      const failure = classifyMediaError(e)
      lastFailure = failure
      logCamera("getUserMedia-error", {
        index: i,
        kind: failure.kind,
        rawName: failure.rawName,
        message: failure.message,
      })
      if (failure.kind === "denied") {
        deniedCount++
        continue
      }
      if (failure.kind === "not_found" || failure.kind === "busy") break
    }
  }

  if (deniedCount === attempts.length) {
    throw {
      kind: "denied" as const,
      message: "O navegador bloqueou a câmera. Clique em “Permitir câmera” e aceite no pop-up.",
    } satisfies CameraAccessFailure
  }

  throw lastFailure ?? { kind: "unknown", message: "Não foi possível iniciar a câmera." }
}

export async function applyContinuousFocus(stream: MediaStream): Promise<void> {
  const track = stream.getVideoTracks()[0]
  if (!track) return
  try {
    await track.applyConstraints({
      advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
    })
  } catch {
    /* opcional */
  }
}

export type AttachVideoResult =
  | { ok: true }
  | { ok: false; failure: CameraAccessFailure }

/** Conecta stream ao <video> e aguarda preview (detecta autoplay bloqueado). */
export async function attachStreamToVideo(
  stream: MediaStream,
  video: HTMLVideoElement,
  timeoutMs = 8000,
): Promise<AttachVideoResult> {
  if (!isStreamLive(stream)) {
    return {
      ok: false,
      failure: {
        kind: "stream_inactive",
        message: "Stream da câmera inativo. Toque em “Permitir câmera” novamente.",
      },
    }
  }

  video.srcObject = stream
  video.muted = true
  video.playsInline = true
  video.setAttribute("playsinline", "true")
  video.setAttribute("webkit-playsinline", "true")

  const waitMeta = new Promise<void>((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error("metadata-timeout")), timeoutMs)
    const onReady = () => {
      window.clearTimeout(t)
      video.removeEventListener("loadedmetadata", onReady)
      resolve()
    }
    if (video.readyState >= 1) {
      window.clearTimeout(t)
      resolve()
    } else {
      video.addEventListener("loadedmetadata", onReady, { once: true })
    }
  })

  try {
    await waitMeta
    logCamera("video-metadata", {
      readyState: video.readyState,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
    })
    await video.play()
    logCamera("video-play-ok", { readyState: video.readyState, paused: video.paused })
    return { ok: true }
  } catch (e) {
    const err = e as { name?: string; message?: string }
    logCamera("video-play-fail", { name: err?.name, message: err?.message, readyState: video.readyState })
    if (err?.name === "NotAllowedError") {
      return {
        ok: false,
        failure: {
          kind: "play_blocked",
          rawName: err.name,
          message: "Preview bloqueado. Toque na tela ou em “Permitir câmera” para iniciar o vídeo.",
        },
      }
    }
    return {
      ok: false,
      failure: {
        kind: "unknown",
        rawName: err?.name,
        message: err?.message ? `Preview falhou: ${err.message}` : "Preview da câmera não iniciou.",
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
