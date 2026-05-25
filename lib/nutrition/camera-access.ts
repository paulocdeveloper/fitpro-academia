export type CameraFacing = "environment" | "user"

export type CameraPermissionState = "unsupported" | "insecure" | "prompt" | "granted" | "denied" | "unknown"

/** Só NotAllowedError real — nunca inferir por kind ou Permissions API. */
export function isNotAllowedErrorName(name: string | undefined): boolean {
  return name === "NotAllowedError" || name === "PermissionDeniedError"
}

export function isPermissionDeniedError(e: unknown): boolean {
  return isNotAllowedErrorName((e as { name?: string })?.name)
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
const PLAY_RETRY_ATTEMPTS = 3
const TRACK_LIVE_WAIT_MS = 2_000

export function logCamera(step: string, data?: Record<string, unknown>) {
  if (typeof console === "undefined") return
  console.info(`[camera] ${step}`, data ?? {})
}

export function logCameraError(step: string, e: unknown, extra?: Record<string, unknown>) {
  const err = e as DOMException & { constraint?: string }
  const name = err?.name ?? "unknown"
  const message = err?.message ?? String(e)
  console.error(`[camera] ${step}`, { name, message, constraint: err?.constraint, ...extra })
  logCamera("error-name", { name, step })
  logCamera("error-message", { message, step })
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
  const video = stream.getVideoTracks()[0]
  return Boolean(video && video.readyState === "live" && video.enabled)
}

export function logTrackState(stream: MediaStream | null | undefined, label: string) {
  if (!stream) {
    logCamera("track-state", { label, stream: null })
    return
  }
  logCamera("track-state", {
    label,
    tracks: stream.getTracks().map((t) => ({
      kind: t.kind,
      label: t.label,
      readyState: t.readyState,
      enabled: t.enabled,
      muted: t.muted,
    })),
  })
}

export function stopMediaStream(stream: MediaStream | null | undefined): void {
  if (!stream) return
  for (const track of stream.getTracks()) {
    track.stop()
    logCamera("track-stopped", { kind: track.kind, label: track.label, readyState: track.readyState })
  }
}

export async function releaseCameraHardware(
  stream?: MediaStream | null,
  video?: HTMLVideoElement | null,
): Promise<void> {
  if (video) {
    video.pause()
    video.srcObject = null
  }
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
    logCamera("permission-state", { state: result.state, note: "hint-only-not-ui-denied" })
    if (result.state === "granted") return "granted"
    if (result.state === "denied") return "denied"
    return "prompt"
  } catch (e) {
    logCameraError("permission-state-error", e)
    return "unknown"
  }
}

async function warmUpDevices(): Promise<MediaDeviceInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const cameras = devices.filter((d) => d.kind === "videoinput")
    logCamera("enumerate-devices", {
      cameras: cameras.length,
      ids: cameras.map((c) => c.deviceId?.slice(0, 8)),
    })
    return cameras
  } catch (e) {
    logCameraError("enumerate-devices", e)
    return []
  }
}

function failureFromDomError(e: unknown): CameraAccessFailure {
  const err = e as DOMException & { constraint?: string }
  const name = err?.name ?? ""
  const msg = err?.message ?? ""

  if (isNotAllowedErrorName(name)) {
    return {
      kind: "denied",
      rawName: name,
      rawMessage: msg,
      message:
        "Permissão da câmera negada. Se já permitiu, verifique o ícone na barra ou desative bloqueadores (ex.: Brave Shields).",
    }
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return {
      kind: "not_found",
      rawName: name,
      rawMessage: msg,
      message: "Nenhuma câmera encontrada neste dispositivo.",
    }
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return {
      kind: "busy",
      rawName: name,
      rawMessage: msg,
      message: "Câmera ocupada por outro aplicativo",
    }
  }
  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
    return {
      kind: "constraint",
      rawName: name,
      rawMessage: msg,
      message: "Configuração de câmera incompatível",
    }
  }
  if (name === "AbortError") {
    return {
      kind: "busy",
      rawName: name,
      rawMessage: msg,
      message: "Falha ao iniciar câmera",
    }
  }
  if (name === "SecurityError") {
    return {
      kind: "gesture",
      rawName: name,
      rawMessage: msg,
      message: "Toque em “Permitir câmera” para iniciar o acesso.",
    }
  }

  return {
    kind: "unknown",
    rawName: name || undefined,
    rawMessage: msg || undefined,
    message: msg || name || "Erro desconhecido ao abrir a câmera",
  }
}

/** Ordem obrigatória: video true → ideal → environment → user */
function buildConstraintAttempts(): { label: string; constraints: MediaStreamConstraints }[] {
  return [
    { label: "1-video-true", constraints: { video: true, audio: false } },
    {
      label: "2-ideal-hd",
      constraints: {
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      },
    },
    {
      label: "3-facing-environment",
      constraints: { video: { facingMode: { ideal: "environment" } }, audio: false },
    },
    {
      label: "4-facing-user",
      constraints: { video: { facingMode: { ideal: "user" } }, audio: false },
    },
    {
      label: "5-ideal-sd",
      constraints: {
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
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
    md
      .getUserMedia(constraints)
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

async function waitForVideoTrackLive(stream: MediaStream, maxMs = TRACK_LIVE_WAIT_MS): Promise<boolean> {
  const track = stream.getVideoTracks()[0]
  if (!track) return false
  if (track.readyState === "live") return true

  return new Promise((resolve) => {
    const deadline = Date.now() + maxMs
    const timer = window.setInterval(() => {
      if (track.readyState === "live") {
        window.clearInterval(timer)
        resolve(true)
      } else if (Date.now() >= deadline) {
        window.clearInterval(timer)
        resolve(false)
      }
    }, 50)
  })
}

async function tryOpenStream(
  label: string,
  constraints: MediaStreamConstraints,
): Promise<{ stream: MediaStream } | { failure: CameraAccessFailure }> {
  try {
    logCamera("getUserMedia-attempt", { label })
    const stream = await getUserMediaWithTimeout(constraints)
    const tracks = stream.getTracks()
    logCamera("stream-created", {
      label,
      trackCount: tracks.length,
      tracks: tracks.map((t) => ({
        kind: t.kind,
        readyState: t.readyState,
        enabled: t.enabled,
        muted: t.muted,
      })),
    })
    logTrackState(stream, label)
    return { stream }
  } catch (e) {
    const failure = failureFromDomError(e)
    logCameraError("getUserMedia-error", e, { label, kind: failure.kind })
    return { failure }
  }
}

async function acceptStream(stream: MediaStream, facing: CameraFacing): Promise<MediaStream | null> {
  const live = await waitForVideoTrackLive(stream)
  if (!live) {
    logCamera("stream-not-live-yet", { facing })
    stopMediaStream(stream)
    return null
  }
  const track = stream.getVideoTracks()[0]
  if (track) {
    try {
      await track.applyConstraints({ facingMode: { ideal: facing } })
      logCamera("facing-ideal-applied", { facing })
    } catch (e) {
      logCameraError("facing-ideal-skip", e, { facing, note: "stream mantido" })
    }
  }
  return stream
}

export async function requestCameraStream(
  facing: CameraFacing = "environment",
): Promise<MediaStream> {
  if (!isGetUserMediaSupported()) {
    throw { kind: "unsupported", message: "Navegador sem suporte a câmera." } satisfies CameraAccessFailure
  }
  if (!isSecureCameraContext()) {
    throw { kind: "insecure", message: "Câmera requer HTTPS (Render) ou localhost." } satisfies CameraAccessFailure
  }

  logCamera("getUserMedia-start", { facing })
  await warmUpDevices()

  const attempts = buildConstraintAttempts()
  let lastFailure: CameraAccessFailure = {
    kind: "unknown",
    message: "Não foi possível iniciar a câmera.",
  }

  for (let round = 0; round < RETRY_ROUNDS; round++) {
    if (round > 0) {
      logCamera("retry-round", { round })
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
    }

    for (const { label, constraints } of attempts) {
      const result = await tryOpenStream(label, constraints)
      if ("failure" in result) {
        lastFailure = result.failure
        continue
      }
      const accepted = await acceptStream(result.stream, facing)
      if (accepted) {
        logCamera("active-stream", { label, facing })
        return accepted
      }
      lastFailure = {
        kind: "stream_inactive",
        message: "Stream sem vídeo ativo após abertura.",
        rawName: "StreamInactive",
      }
    }

    const cameras = await warmUpDevices()
    for (const cam of cameras) {
      if (!cam.deviceId) continue
      const devLabel = `device-${cam.deviceId.slice(0, 8)}`
      const result = await tryOpenStream(devLabel, {
        video: { deviceId: { ideal: cam.deviceId } },
        audio: false,
      })
      if ("failure" in result) {
        lastFailure = result.failure
        continue
      }
      const accepted = await acceptStream(result.stream, facing)
      if (accepted) {
        logCamera("active-stream", { label: devLabel, facing })
        return accepted
      }
    }
  }

  throw {
    ...lastFailure,
    message: lastFailure.rawMessage
      ? `${lastFailure.message} (${lastFailure.rawName}: ${lastFailure.rawMessage})`
      : lastFailure.message,
  } satisfies CameraAccessFailure
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

export type AttachVideoResult = { ok: true } | { ok: false; failure: CameraAccessFailure }

async function waitVideoDimensions(video: HTMLVideoElement, timeoutMs: number): Promise<boolean> {
  if (video.videoWidth > 0 && video.videoHeight > 0) return true
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      cleanup()
      resolve(video.videoWidth > 0 && video.videoHeight > 0)
    }, timeoutMs)
    const onDim = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        cleanup()
        resolve(true)
      }
    }
    const cleanup = () => {
      window.clearTimeout(timer)
      video.removeEventListener("loadeddata", onDim)
      video.removeEventListener("resize", onDim)
    }
    video.addEventListener("loadeddata", onDim)
    video.addEventListener("resize", onDim)
  })
}

async function playVideoWithRetry(video: HTMLVideoElement): Promise<void> {
  let lastError: unknown
  for (let i = 0; i < PLAY_RETRY_ATTEMPTS; i++) {
    try {
      await video.play()
      logCamera("play-ok", {
        attempt: i + 1,
        paused: video.paused,
        readyState: video.readyState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
      })
      return
    } catch (e) {
      lastError = e
      logCameraError("play-failed", e, { attempt: i + 1 })
      if (i < PLAY_RETRY_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, 200 * (i + 1)))
      }
    }
  }
  throw lastError
}

export async function attachStreamToVideo(
  stream: MediaStream,
  video: HTMLVideoElement,
  timeoutMs = 12_000,
): Promise<AttachVideoResult> {
  logTrackState(stream, "attach")

  const videoTrack = stream.getVideoTracks()[0]
  if (!videoTrack) {
    return {
      ok: false,
      failure: {
        kind: "stream_inactive",
        rawName: "NoVideoTrack",
        message: "Nenhuma faixa de vídeo no stream.",
      },
    }
  }

  if (videoTrack.readyState !== "live") {
    const ok = await waitForVideoTrackLive(stream, timeoutMs)
    if (!ok) {
      return {
        ok: false,
        failure: {
          kind: "stream_inactive",
          rawName: "TrackNotLive",
          message: "Stream inativo antes do preview.",
        },
      }
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

  try {
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
    })
  } catch (e) {
    logCameraError("video-metadata-timeout", e)
    return {
      ok: false,
      failure: {
        kind: "unknown",
        rawName: "MetadataTimeout",
        message: "Preview: tempo esgotado aguardando metadados do vídeo.",
      },
    }
  }

  logCamera("video-metadata", {
    readyState: video.readyState,
    videoWidth: video.videoWidth,
    videoHeight: video.videoHeight,
  })

  const hasDims = await waitVideoDimensions(video, 3_000)
  if (!hasDims) {
    logCamera("video-dimensions-missing", {
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      readyState: video.readyState,
    })
  }

  try {
    await playVideoWithRetry(video)
    if (video.paused || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return {
        ok: false,
        failure: {
          kind: "play_blocked",
          rawName: "PlayIncomplete",
          message: "Preview não iniciou. Toque em “Tentar novamente”.",
        },
      }
    }
    logCamera("active-stream", {
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      readyState: video.readyState,
    })
    return { ok: true }
  } catch (e) {
    const err = e as DOMException
    const failure = failureFromDomError(e)
    if (isNotAllowedErrorName(err?.name)) {
      return {
        ok: false,
        failure: {
          kind: "play_blocked",
          rawName: err.name,
          rawMessage: err.message,
          message: "Autoplay bloqueado. Toque em “Tentar novamente” ou na área do vídeo.",
        },
      }
    }
    return { ok: false, failure }
  }
}

/** denied SOMENTE se rawName é NotAllowedError — nunca por kind genérico. */
export function isCameraPermissionDenied(failure: CameraAccessFailure): boolean {
  return isNotAllowedErrorName(failure.rawName)
}

export function mapFailureToCameraPhase(
  failure: CameraAccessFailure,
): "denied" | "failed" | "unsupported" {
  if (failure.kind === "unsupported" || failure.kind === "insecure") return "unsupported"
  if (isCameraPermissionDenied(failure)) return "denied"
  return "failed"
}

export function getCameraUiTitle(
  phase: "prompt" | "loading" | "live" | "denied" | "failed" | "unsupported",
  failure?: CameraAccessFailure | null,
): string {
  if (phase === "denied") return "Permissão da câmera negada"
  if (phase === "unsupported") return "Câmera não suportada"
  if (phase === "loading") return "Iniciando câmera…"
  if (phase === "live") return "Câmera ativa"
  if (phase === "prompt") return "Permita o acesso à câmera"

  const name = failure?.rawName ?? ""
  if (name === "NotReadableError" || name === "TrackStartError") return "Câmera ocupada"
  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
    return "Configuração incompatível"
  }
  if (name === "AbortError") return "Falha ao iniciar câmera"
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "Câmera não encontrada"
  if (failure?.kind === "play_blocked") return "Preview bloqueado"
  if (failure?.kind === "stream_inactive") return "Stream inativo"
  return "Falha ao iniciar a câmera"
}

export function formatCameraErrorDetail(failure: CameraAccessFailure): string {
  const base = failure.message
  if (failure.rawName && failure.rawMessage && !base.includes(failure.rawMessage)) {
    return `${base} (${failure.rawName}: ${failure.rawMessage})`
  }
  return base
}
