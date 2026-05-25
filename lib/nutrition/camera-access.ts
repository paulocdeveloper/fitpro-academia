export type CameraFacing = "environment" | "user"

export type CameraPermissionState = "unsupported" | "insecure" | "prompt" | "granted" | "denied" | "unknown"

export type CameraAccessErrorKind =
  | "unsupported"
  | "insecure"
  | "denied"
  | "not_found"
  | "busy"
  | "constraint"
  | "unknown"

export type CameraAccessFailure = {
  kind: CameraAccessErrorKind
  message: string
  rawName?: string
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

/** Consulta Permissions API quando disponível (Chrome/Android; Safari parcial). */
export async function queryCameraPermission(): Promise<CameraPermissionState> {
  if (!isGetUserMediaSupported()) return "unsupported"
  if (!isSecureCameraContext()) return "insecure"

  const perms = navigator.permissions
  if (!perms?.query) return "unknown"

  try {
    const result = await perms.query({ name: "camera" as PermissionName })
    if (result.state === "granted") return "granted"
    if (result.state === "denied") return "denied"
    return "prompt"
  } catch {
    return "unknown"
  }
}

function classifyMediaError(e: unknown): CameraAccessFailure {
  const err = e as { name?: string; message?: string }
  const name = typeof err?.name === "string" ? err.name : ""

  if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
    return {
      kind: "denied",
      rawName: name,
      message:
        "Permissão da câmera bloqueada. Toque em “Permitir câmera” e aceite no pop-up do navegador.",
    }
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return { kind: "not_found", rawName: name, message: "Nenhuma câmera encontrada neste dispositivo." }
  }
  if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") {
    return {
      kind: "busy",
      rawName: name,
      message: "Câmera em uso por outro app. Feche outros apps e tente novamente.",
    }
  }
  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
    return {
      kind: "constraint",
      rawName: name,
      message: "Não foi possível usar essa câmera. Tentaremos outra configuração.",
    }
  }

  const msg = typeof err?.message === "string" ? err.message : ""
  return {
    kind: "unknown",
    rawName: name,
    message: msg ? `Não foi possível abrir a câmera (${msg}).` : "Não foi possível abrir a câmera.",
  }
}

/**
 * Ordem pensada para disparar o pop-up nativo (Safari/iPhone):
 * 1) video: true (máxima compatibilidade)
 * 2) facing ideal (sem exact)
 * 3) resolução ideal
 */
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

async function tryGetUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia(constraints)
}

/**
 * Solicita stream da câmera — chamar diretamente no onClick do usuário.
 */
export async function requestCameraStream(
  facing: CameraFacing = "environment",
): Promise<MediaStream> {
  if (!isGetUserMediaSupported()) {
    throw {
      kind: "unsupported" as const,
      message: "Seu navegador não suporta acesso à câmera.",
    } satisfies CameraAccessFailure
  }
  if (!isSecureCameraContext()) {
    throw {
      kind: "insecure" as const,
      message: "A câmera só funciona em HTTPS ou localhost.",
    } satisfies CameraAccessFailure
  }

  const attempts = buildConstraintAttempts(facing)
  let lastFailure: CameraAccessFailure | null = null
  let sawDenied = false

  for (const constraints of attempts) {
    try {
      const stream = await tryGetUserMedia(constraints)
      return stream
    } catch (e) {
      const failure = classifyMediaError(e)
      lastFailure = failure
      if (failure.kind === "denied") {
        sawDenied = true
        break
      }
      if (failure.kind === "not_found" || failure.kind === "busy") break
    }
  }

  if (sawDenied) {
    throw {
      kind: "denied" as const,
      message:
        "Permissão negada. Toque em “Permitir câmera” — o navegador deve mostrar um pop-up para autorizar.",
    } satisfies CameraAccessFailure
  }

  throw lastFailure ?? { kind: "unknown", message: "Não foi possível abrir a câmera." }
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
