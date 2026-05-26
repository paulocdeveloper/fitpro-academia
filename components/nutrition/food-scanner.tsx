"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Camera, X, ScanLine, RefreshCw, Zap, Plus, Pencil, SwitchCamera, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  FoodScannerResults,
  itemToScannedFood,
  plateToScannedFood,
} from "@/components/nutrition/food-scanner-results"
import { captureFrameQuality, frameStabilityScore } from "@/lib/nutrition/client-image-quality"
import {
  applyContinuousFocus,
  attachStreamToVideo,
  cameraFacingLabel,
  formatCameraErrorDetail,
  getCameraUiTitle,
  getInitialCameraFacing,
  inferFacingFromTrack,
  isGetUserMediaSupported,
  isStreamLive,
  logCamera,
  mapFailureToCameraPhase,
  persistCameraFacing,
  releaseCameraHardware,
  requestCameraStream,
  stopMediaStream,
  type CameraAccessFailure,
  type CameraFacing,
} from "@/lib/nutrition/camera-access"
import type { MealAnalysisResult } from "@/lib/nutrition/types"

export type ScannedFood = {
  nome: string
  quantidade_g: number
  calorias_kcal: number
  proteinas_g: number
  carboidratos_g: number
  gorduras_g: number
}

type ScannerState = "idle" | "camera" | "scanning" | "detected" | "not_found" | "poor_quality" | "manual"

/**
 * Máquina de estados da câmera (sem falso "negado"):
 * - prompt: aguardando clique em Permitir
 * - loading: getUserMedia / attach em andamento
 * - live: preview ativo
 * - denied: só NotAllowedError / PermissionDeniedError reais
 * - failed: constraint, not_found, play, stream inativo
 * - unsupported: sem API ou HTTP inseguro
 */
type CameraPhase = "prompt" | "loading" | "live" | "denied" | "failed" | "unsupported"

const SCAN_STEPS = [
  "Enviando foto do prato...",
  "Analisando comida com IA...",
  "Identificando alimentos no prato...",
  "Estimando porções e macros...",
]

type FoodScannerProps = {
  onAddFood?: (food: ScannedFood) => void
  /** Oculta o botão padrão — use com FoodScannerOpenButton. */
  hideTrigger?: boolean
  /** Modo controlado: modal só renderiza quando true. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** @deprecated Preferir open + onOpenChange */
  onRegisterOpen?: (open: (() => void) | null) => void
}

export function FoodScannerOpenButton({
  onOpen,
  size = "sm",
  className,
}: {
  onOpen: () => void
  size?: "sm" | "default" | "lg"
  className?: string
}) {
  return (
    <Button
      type="button"
      size={size}
      className={className ?? "gap-2 text-xs font-semibold neon-glow"}
      style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
      onClick={onOpen}
    >
      <Camera className="w-3.5 h-3.5" />
      Escanear Comida
    </Button>
  )
}

export function FoodScanner({
  onAddFood,
  hideTrigger = false,
  open: openProp,
  onOpenChange,
  onRegisterOpen,
}: FoodScannerProps) {
  const isControlled = openProp !== undefined
  const [state, setState] = useState<ScannerState>("idle")
  const [analysis, setAnalysis] = useState<MealAnalysisResult | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [scanStep, setScanStep] = useState(0)
  const [stability, setStability] = useState(0)
  const [qualityHint, setQualityHint] = useState<string | null>(null)

  const [manualName, setManualName] = useState("")
  const [manualGrams, setManualGrams] = useState("150")
  const [manualKcal100, setManualKcal100] = useState("")
  const [manualProt100, setManualProt100] = useState("")
  const [manualCarbo100, setManualCarbo100] = useState("")
  const [manualGord100, setManualGord100] = useState("")
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraFailure, setCameraFailure] = useState<CameraAccessFailure | null>(null)
  const [cameraPhase, setCameraPhase] = useState<CameraPhase>("prompt")
  const cameraRequestId = useRef(0)
  const mountedRef = useRef(true)
  const [facingMode, setFacingMode] = useState<CameraFacing>(() => getInitialCameraFacing())
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false)
  const [visionReady, setVisionReady] = useState<boolean | null>(null)
  const [visionModel, setVisionModel] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null)
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  /** Garante modal fechado e câmera desligada ao montar (navegação /dietas). */
  useEffect(() => {
    stopCamera()
    setState("idle")
    setCameraPhase("prompt")
    setCameraError(null)
    setCameraFailure(null)
    setIsSwitchingCamera(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apenas no mount
  }, [])

  const stopCamera = useCallback(() => {
    const v = videoRef.current
    stopMediaStream(streamRef.current)
    streamRef.current = null
    void releaseCameraHardware(null, v)
    logCamera("stream-stopped")
  }, [])

  const applyCameraFailure = useCallback((failure: CameraAccessFailure) => {
    const phase = mapFailureToCameraPhase(failure)
    setCameraFailure(failure)
    setCameraPhase(phase)
    setCameraError(formatCameraErrorDetail(failure))
    logCamera("request-failed", {
      phase,
      kind: failure.kind,
      rawName: failure.rawName,
      rawMessage: failure.rawMessage,
    })
  }, [])

  const activateLiveStream = useCallback(
    async (stream: MediaStream, requestId: number) => {
      const video = videoRef.current
      if (!video) {
        logCamera("video-missing", { requestId })
        if (mountedRef.current && requestId === cameraRequestId.current) {
          setCameraPhase("failed")
          setCameraError("Elemento de vídeo indisponível. Feche e abra o scanner novamente.")
        }
        return
      }

      const attach = await attachStreamToVideo(stream, video)
      if (!mountedRef.current || requestId !== cameraRequestId.current) {
        logCamera("attach-stale", { requestId })
        return
      }

      if (!attach.ok) {
        applyCameraFailure(attach.failure)
        return
      }

      if (!isStreamLive(stream) && video.videoWidth <= 0) {
        applyCameraFailure({
          kind: "stream_inactive",
          rawName: "StreamInactive",
          message: "Stream inativo. Toque em “Tentar novamente”.",
        })
        return
      }

      setCameraPhase("live")
      setCameraFailure(null)
      setCameraError(null)
      logCamera("active-stream", {
        requestId,
        readyState: video.readyState,
        w: video.videoWidth,
        h: video.videoHeight,
      })
    },
    [applyCameraFailure],
  )

  const syncFacingFromStream = useCallback((stream: MediaStream) => {
    const inferred = inferFacingFromTrack(stream.getVideoTracks()[0])
    if (inferred) {
      setFacingMode(inferred)
      persistCameraFacing(inferred)
    }
  }, [])

  /** getUserMedia no clique — pop-up nativo (ou gesto do botão Escanear). */
  const requestCameraPermission = useCallback(
    (preferredFacing?: CameraFacing, options?: { switchInPlace?: boolean }) => {
      const facing = preferredFacing ?? facingMode
      if (preferredFacing) {
        setFacingMode(preferredFacing)
        persistCameraFacing(preferredFacing)
      }

      if (!isGetUserMediaSupported()) {
        setCameraPhase("unsupported")
        setCameraError("Seu navegador não suporta acesso à câmera.")
        return
      }

      const switchInPlace = Boolean(options?.switchInPlace)
      const requestId = ++cameraRequestId.current
      setCameraError(null)
      setCameraFailure(null)
      if (switchInPlace) {
        setIsSwitchingCamera(true)
      } else {
        setCameraPhase("loading")
      }
      logCamera("user-request", { requestId, facing, switchInPlace })

      void (async () => {
        try {
          if (!switchInPlace && streamRef.current && isStreamLive(streamRef.current)) {
            syncFacingFromStream(streamRef.current)
            await activateLiveStream(streamRef.current, requestId)
            return
          }

          await releaseCameraHardware(streamRef.current, videoRef.current)
          streamRef.current = null
          const stream = await requestCameraStream(facing)
          if (!mountedRef.current || requestId !== cameraRequestId.current) return

          streamRef.current = stream
          syncFacingFromStream(stream)
          await applyContinuousFocus(stream)
          await activateLiveStream(stream, requestId)
        } catch (e) {
          if (!mountedRef.current || requestId !== cameraRequestId.current) return
          const failure = (e as CameraAccessFailure)?.kind
            ? (e as CameraAccessFailure)
            : {
                kind: "unknown" as const,
                rawName: (e as Error)?.name,
                rawMessage: (e as Error)?.message,
                message: (e as Error)?.message || "Não foi possível abrir a câmera.",
              }
          applyCameraFailure(failure)
        } finally {
          if (mountedRef.current && requestId === cameraRequestId.current) {
            setIsSwitchingCamera(false)
          }
        }
      })()
    },
    [activateLiveStream, applyCameraFailure, facingMode, syncFacingFromStream],
  )

  /** Abre modal apenas — câmera só inicia após "Permitir câmera" (clique manual). */
  const openScanner = useCallback(() => {
    setQualityHint(null)
    setIsSwitchingCamera(false)
    setFacingMode(getInitialCameraFacing())
    setCameraError(null)
    setCameraFailure(null)

    if (!isGetUserMediaSupported()) {
      onOpenChange?.(true)
      setState("camera")
      setCameraPhase("unsupported")
      setCameraError("Seu navegador não suporta acesso à câmera.")
      return
    }

    stopCamera()
    onOpenChange?.(true)
    setState("camera")
    setCameraPhase("prompt")
    logCamera("scanner-opened-manual", { autoCamera: false })
  }, [onOpenChange, stopCamera])

  useEffect(() => {
    onRegisterOpen?.(openScanner)
    return () => onRegisterOpen?.(null)
  }, [onRegisterOpen, openScanner])

  /** Sincroniza abertura controlada pelo pai (isScannerOpen = true). */
  useEffect(() => {
    if (!isControlled || !openProp || state !== "idle") return
    setQualityHint(null)
    setIsSwitchingCamera(false)
    setFacingMode(getInitialCameraFacing())
    setCameraError(null)
    setCameraFailure(null)
    stopCamera()
    if (!isGetUserMediaSupported()) {
      setState("camera")
      setCameraPhase("unsupported")
      setCameraError("Seu navegador não suporta acesso à câmera.")
      return
    }
    setState("camera")
    setCameraPhase("prompt")
  }, [isControlled, openProp, state, stopCamera])

  /** Fecha modal controlado externamente. */
  useEffect(() => {
    if (!isControlled || openProp) return
    stopCamera()
    setState("idle")
    setAnalysis(null)
    setPreviewImage(null)
    setCameraError(null)
    setCameraFailure(null)
    setCameraPhase("prompt")
    setQualityHint(null)
    setStability(0)
    prevFrameRef.current = null
  }, [isControlled, openProp, stopCamera])

  const switchCamera = useCallback(() => {
    const next: CameraFacing = facingMode === "environment" ? "user" : "environment"
    requestCameraPermission(next, { switchInPlace: true })
  }, [facingMode, requestCameraPermission])

  const captureAndScan = async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const captured = captureFrameQuality(video, canvas)
    if (!captured) {
      setState("poor_quality")
      return
    }

    if (!captured.report.ok) {
      setPreviewImage(captured.dataUrl)
      setQualityHint(captured.report.issues.join(" "))
      setState("poor_quality")
      stopCamera()
      return
    }

    if (stability < 0.55) {
      setQualityHint("Segure firme e aguarde a estabilização antes de capturar.")
      return
    }

    setPreviewImage(captured.dataUrl)
    setState("scanning")
    setScanStep(0)
    stopCamera()

    const stepTimer = window.setInterval(() => {
      setScanStep((s) => Math.min(s + 1, SCAN_STEPS.length - 1))
    }, 700)

    try {
      const res = await fetch("/api/nutrition/analyze", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: captured.dataUrl,
          quality: {
            ok: captured.report.ok,
            score: captured.report.score,
            issues: captured.report.issues,
          },
        }),
      })
      const data = (await res.json().catch(() => null)) as MealAnalysisResult | { error?: string }
      clearInterval(stepTimer)

      const premiumRequired =
        !res.ok &&
        res.status === 402 &&
        data &&
        typeof data === "object" &&
        "code" in data &&
        (data as { code?: string }).code === "PREMIUM_REQUIRED"
      if (premiumRequired) {
        setAnalysis(null)
        setState("not_found")
        setQualityHint("FitPro Premium necessário para o scanner com IA.")
        window.location.href = "/premium"
        return
      }

      const result = data as MealAnalysisResult
      const isAnalyzePayload =
        result && typeof result === "object" && "engine" in result && Array.isArray(result.items)

      if (!res.ok && res.status !== 422 && !isAnalyzePayload) {
        setAnalysis(null)
        setState("not_found")
        setQualityHint(typeof data?.error === "string" ? data.error : "Falha na analise.")
        return
      }

      if (!isAnalyzePayload) {
        setAnalysis(null)
        setState("not_found")
        setQualityHint("Resposta inválida do servidor.")
        return
      }
      setAnalysis(result)
      const hasItems = result.items.length > 0
      if (result.ok && hasItems) {
        setState("detected")
      } else if (hasItems) {
        setQualityHint(result.warning ?? result.error ?? "Revise os itens detectados.")
        setState("detected")
      } else {
        setQualityHint(result.error ?? "Confiança insuficiente para identificar o prato.")
        setState(result.imageQuality?.ok === false ? "poor_quality" : "not_found")
      }
    } catch {
      clearInterval(stepTimer)
      setState("not_found")
      setQualityHint("Erro de conexão ao analisar a imagem.")
    }
  }

  const handleConfirmItem = (item: Parameters<typeof itemToScannedFood>[0]) => {
    onAddFood?.(itemToScannedFood(item))
    handleClose()
  }

  const handleConfirmPlate = () => {
    if (!analysis) return
    onAddFood?.(plateToScannedFood(analysis))
    handleClose()
  }

  const handleManualAdd = async () => {
    const nome = manualName.trim()
    if (!nome) return
    const g = Number(manualGrams) || 0
    const kcal100 = Number(manualKcal100) || 0
    const p100 = Number(manualProt100) || 0
    const c100 = Number(manualCarbo100) || 0
    const f100 = Number(manualGord100) || 0
    const mult = g > 0 ? g / 100 : 0

    // Tenta cadastrar/guardar o alimento para reutilizar depois.
    try {
      await fetch("/api/nutrition/alimentos", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          kcal_100g: kcal100,
          proteinas_100g: p100,
          carbos_100g: c100,
          gorduras_100g: f100,
        }),
      })
    } catch {
      // se falhar, ainda assim adiciona à refeição (modo offline)
    }

    onAddFood?.({
      nome,
      quantidade_g: g,
      calorias_kcal: Math.round(kcal100 * mult),
      proteinas_g: Number((p100 * mult).toFixed(1)),
      carboidratos_g: Number((c100 * mult).toFixed(1)),
      gorduras_g: Number((f100 * mult).toFixed(1)),
    })
    setManualName("")
    setManualGrams("150")
    setManualKcal100("")
    setManualProt100("")
    setManualCarbo100("")
    setManualGord100("")
    handleClose()
  }

  const handleClose = () => {
    stopCamera()
    onOpenChange?.(false)
    setState("idle")
    setAnalysis(null)
    setPreviewImage(null)
    setCameraError(null)
    setCameraFailure(null)
    setCameraPhase("prompt")
    setQualityHint(null)
    setStability(0)
    prevFrameRef.current = null
  }

  useEffect(() => () => stopCamera(), [stopCamera])

  useEffect(() => {
    if (state === "idle") return
    let cancelled = false
    void fetch("/api/nutrition/status", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setVisionReady(Boolean(data?.vision?.configured))
        setVisionModel(typeof data?.vision?.model === "string" ? data.vision.model : null)
      })
      .catch(() => {
        if (!cancelled) setVisionReady(null)
      })
    return () => {
      cancelled = true
    }
  }, [state])

  useEffect(() => {
    if (state !== "camera" || cameraPhase !== "live") return
    let raf = 0
    if (!sampleCanvasRef.current && typeof document !== "undefined") {
      sampleCanvasRef.current = document.createElement("canvas")
    }
    const tick = () => {
      const v = videoRef.current
      const sc = sampleCanvasRef.current
      if (v && sc && v.readyState >= 2 && v.videoWidth > 0) {
        const sw = 64
        const sh = Math.round((v.videoHeight / v.videoWidth) * sw)
        sc.width = sw
        sc.height = sh
        const ctx = sc.getContext("2d")
        if (ctx) {
          ctx.drawImage(v, 0, 0, sw, sh)
          const data = ctx.getImageData(0, 0, sw, sh).data
          if (prevFrameRef.current && prevFrameRef.current.length === data.length) {
            setStability(frameStabilityScore(prevFrameRef.current, data))
          }
          prevFrameRef.current = new Uint8ClampedArray(data)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [state, cameraPhase])

  const isModalOpen = isControlled ? Boolean(openProp) : state !== "idle"

  return (
    <>
      {!hideTrigger && <FoodScannerOpenButton onOpen={openScanner} />}

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "oklch(0.05 0.005 260 / 0.92)", backdropFilter: "blur(6px)" }}
        >
          <div
            className="relative w-full max-w-md rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "var(--neon-dim)" }}
                >
                  <Camera className="w-4 h-4 neon-text" />
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                    {state === "camera" && "Escanear Comida"}
                    {state === "scanning" && "Analisando comida com IA"}
                    {state === "detected" && "Análise Completa"}
                    {state === "not_found" && "Não Identificado"}
                    {state === "poor_quality" && "Imagem Inadequada"}
                    {state === "manual" && "Adicionar Manualmente"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {state === "camera" && "Aponte para o prato — detecção automática"}
                    {state === "scanning" &&
                      (visionReady
                        ? `GPT-4o Vision · ${SCAN_STEPS[scanStep]}`
                        : SCAN_STEPS[scanStep])}
                    {state === "detected" && "Macros estimados pela IA"}
                    {state === "not_found" && "Tente novamente com melhor enquadramento"}
                    {state === "poor_quality" && "Ajuste luz e estabilidade"}
                    {state === "manual" && "Opcional — use se a IA não reconhecer"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {visionReady !== null && (
              <div
                className="mx-5 -mt-2 mb-1 flex items-center gap-2 rounded-lg px-3 py-1.5 text-[10px]"
                style={{
                  background: visionReady ? "var(--neon-dim)" : "oklch(0.75 0.18 80 / 0.12)",
                  border: `1px solid ${visionReady ? "var(--primary)40" : "oklch(0.75 0.18 80 / 0.35)"}`,
                }}
              >
                <Sparkles className="w-3 h-3 shrink-0" style={{ color: visionReady ? "var(--primary)" : "oklch(0.75 0.18 80)" }} />
                <span className="text-muted-foreground">
                  {visionReady
                    ? `GPT-4o Vision ativo${visionModel ? ` (${visionModel})` : ""} — reconhecimento real`
                    : "Vision offline — configure OPENAI_API_KEY no servidor"}
                </span>
              </div>
            )}

            {/* Corpo */}
            <div className="p-5 space-y-4">

              {/* CÂMERA */}
              {(state === "camera") && (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden aspect-video bg-black">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={{
                        transform: facingMode === "user" ? "scaleX(-1)" : "none",
                        visibility: cameraPhase === "live" ? "visible" : "hidden",
                      }}
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {cameraPhase !== "live" && (
                      <div
                        className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 px-4 text-center"
                        style={{ background: "var(--secondary)" }}
                      >
                        {cameraPhase === "loading" ? (
                          <>
                            <div
                              className="w-12 h-12 rounded-full border-2 animate-spin"
                              style={{ borderColor: "var(--border)", borderTopColor: "var(--primary)" }}
                            />
                            <p className="font-semibold text-sm">Iniciando câmera…</p>
                            <p className="text-xs text-muted-foreground max-w-xs">
                              Aguarde o preview ao vivo. Aceite o pop-up se o navegador solicitar.
                            </p>
                          </>
                        ) : (
                          <>
                            <Camera className="w-10 h-10 text-muted-foreground" />
                            <div>
                              <p className="font-semibold text-sm">
                                {getCameraUiTitle(cameraPhase, cameraFailure)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                                {cameraError ??
                                  "Toque em “Permitir câmera”. O navegador deve exibir o pedido de acesso."}
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              className="gap-2 font-semibold neon-glow"
                              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                              onClick={() => requestCameraPermission(getInitialCameraFacing())}
                            >
                              <Camera className="w-4 h-4" />
                              Permitir câmera
                            </Button>
                            {(cameraPhase === "denied" || cameraPhase === "failed") && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => requestCameraPermission(getInitialCameraFacing())}
                                className="gap-1.5"
                              >
                                <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {cameraPhase === "live" && (
                      <>
                      <div
                        className="absolute top-3 left-3 z-10 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide"
                        style={{
                          background: "oklch(0.05 0.005 260 / 0.75)",
                          backdropFilter: "blur(4px)",
                          color: "var(--foreground)",
                          border: "1px solid var(--border)",
                        }}
                        aria-live="polite"
                      >
                        {cameraFacingLabel(facingMode)}
                      </div>
                      <button
                        type="button"
                        onClick={switchCamera}
                        disabled={isSwitchingCamera}
                        className="absolute top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full transition-colors disabled:opacity-60"
                        style={{
                          background: "oklch(0.05 0.005 260 / 0.75)",
                          backdropFilter: "blur(4px)",
                          color: "var(--foreground)",
                        }}
                        aria-label={facingMode === "environment" ? "Usar câmera frontal" : "Usar câmera traseira"}
                        title={facingMode === "environment" ? "Câmera traseira (toque para frontal)" : "Câmera frontal (toque para traseira)"}
                      >
                        {isSwitchingCamera ? (
                          <RefreshCw className="h-5 w-5 animate-spin" />
                        ) : (
                          <SwitchCamera className="h-5 w-5" />
                        )}
                      </button>
                      {isSwitchingCamera && (
                        <div
                          className="absolute inset-0 z-[5] pointer-events-none"
                          style={{ background: "oklch(0.05 0.005 260 / 0.25)" }}
                        />
                      )}
                      {/* Scan overlay */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="relative w-48 h-48">
                          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 rounded-tl-md" style={{ borderColor: "var(--primary)" }} />
                          <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 rounded-tr-md" style={{ borderColor: "var(--primary)" }} />
                          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 rounded-bl-md" style={{ borderColor: "var(--primary)" }} />
                          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 rounded-br-md" style={{ borderColor: "var(--primary)" }} />
                          <div
                            className="absolute left-0 right-0 h-0.5 top-1/2 opacity-60 animate-pulse"
                            style={{ background: "var(--primary)" }}
                          />
                          <ScanLine className="absolute inset-0 m-auto w-6 h-6 opacity-0" />
                        </div>
                      </div>
                      <div className="absolute bottom-12 left-3 right-3 space-y-1.5">
                        <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                          <span>Estabilidade</span>
                          <span>{Math.round(stability * 100)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--secondary)" }}>
                          <div
                            className="h-full transition-all duration-300 rounded-full"
                            style={{
                              width: `${Math.round(stability * 100)}%`,
                              background: stability >= 0.55 ? "var(--primary)" : "oklch(0.75 0.18 80)",
                            }}
                          />
                        </div>
                      </div>
                      {qualityHint && state === "camera" && (
                        <p className="absolute top-14 left-3 right-14 text-[10px] text-amber-400/90">{qualityHint}</p>
                      )}
                      <div
                        className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs font-medium"
                        style={{ background: "oklch(0.05 0.005 260 / 0.75)", backdropFilter: "blur(4px)", color: "var(--foreground)" }}
                      >
                        Posicione o alimento no centro · {cameraFacingLabel(facingMode)}
                      </div>
                      </>
                    )}
                  </div>
                  <Button
                    className="w-full gap-2 font-semibold neon-glow"
                    style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                    onClick={captureAndScan}
                    disabled={cameraPhase !== "live" || isSwitchingCamera || stability < 0.55}
                  >
                    <Zap className="w-4 h-4" />
                    Capturar e Analisar
                  </Button>
                </div>
              )}

              {/* SCANNING */}
              {state === "scanning" && (
                <div className="space-y-4">
                  {previewImage && (
                    <div className="relative rounded-xl overflow-hidden aspect-video bg-black">
                      <img src={previewImage} alt="Captura" className="w-full h-full object-cover opacity-80" />
                      <div
                        className="absolute left-0 right-0 h-0.5 top-1/3 animate-pulse"
                        style={{ background: "var(--primary)", boxShadow: "0 0 12px var(--primary)" }}
                      />
                    </div>
                  )}
                  <div className="flex flex-col items-center py-2 gap-4">
                    <div className="relative w-16 h-16">
                      <div
                        className="w-16 h-16 rounded-full border-2 animate-spin"
                        style={{ borderColor: "var(--border)", borderTopColor: "var(--primary)" }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 neon-text" />
                      </div>
                    </div>
                    <div className="text-center space-y-1 w-full">
                      <p className="font-semibold text-sm">Analisando comida com IA</p>
                      <p className="text-xs text-muted-foreground animate-pulse">
                        {visionReady ? `Motor: ${visionModel ?? "GPT-4o"}` : "Conectando Vision..."} ·{" "}
                        {SCAN_STEPS[scanStep]}
                      </p>
                    </div>
                    <div className="w-full space-y-1.5">
                      {SCAN_STEPS.map((step, i) => (
                        <div
                          key={step}
                          className="flex items-center gap-2 text-[11px]"
                          style={{ opacity: i <= scanStep ? 1 : 0.35 }}
                        >
                          <div
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{
                              background: i <= scanStep ? "var(--primary)" : "var(--muted-foreground)",
                            }}
                          />
                          <span className={i === scanStep ? "text-foreground font-medium" : "text-muted-foreground"}>
                            {step}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {state === "detected" && analysis && (
                <FoodScannerResults
                  analysis={analysis}
                  previewImage={previewImage}
                  onAddItem={handleConfirmItem}
                  onAddPlate={handleConfirmPlate}
                  onRetry={() => {
                    setAnalysis(null)
                    setPreviewImage(null)
                    openScanner()
                  }}
                  onClose={handleClose}
                />
              )}


              {(state === "not_found" || state === "poor_quality") && (
                <div className="space-y-4">
                  {previewImage && state === "poor_quality" && (
                    <div className="relative rounded-xl overflow-hidden aspect-video bg-black opacity-60">
                      <img src={previewImage} alt="Captura rejeitada" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div
                    className="rounded-xl flex flex-col items-center justify-center gap-3 py-8 text-center"
                    style={{ background: "var(--secondary)" }}
                  >
                    {state === "poor_quality" ? (
                      <ScanLine className="w-10 h-10 text-amber-400" />
                    ) : (
                      <Camera className="w-10 h-10 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-semibold text-sm">
                        {state === "poor_quality" ? "Imagem inadequada" : "Alimento não identificado"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                        {qualityHint ??
                          (state === "poor_quality"
                            ? "Melhore a iluminação, enquadre o prato e segure firme antes de capturar."
                            : "Tente capturar novamente ou adicione manualmente.")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => {
                        setQualityHint(null)
                        openScanner()
                      }}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Tentar novamente
                    </Button>
                    <Button
                      className="flex-1 gap-2 font-semibold"
                      style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                      onClick={() => {
                        if (analysis?.items?.[0] && !manualName) {
                          setManualName(analysis.items[0].nome)
                          setManualGrams(String(analysis.items[0].quantidade_g))
                          setManualKcal100(String(analysis.items[0].kcal))
                          setManualProt100(String(analysis.items[0].proteinas_g))
                          setManualCarbo100(String(analysis.items[0].carboidratos_g))
                          setManualGord100(String(analysis.items[0].gorduras_g))
                        }
                        setState("manual")
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                      Inserir manual
                    </Button>
                  </div>
                </div>
              )}

              {/* MANUAL */}
              {state === "manual" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Nome do alimento *</label>
                    <Input
                      placeholder="Ex: Peito de frango grelhado"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      style={{ background: "var(--secondary)" }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">Quantidade (g)</label>
                      <Input
                        type="number"
                        placeholder="150"
                        value={manualGrams}
                        onChange={(e) => setManualGrams(e.target.value)}
                        style={{ background: "var(--secondary)" }}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">Calorias (kcal/100g)</label>
                      <Input
                        type="number"
                        placeholder="160"
                        value={manualKcal100}
                        onChange={(e) => setManualKcal100(e.target.value)}
                        style={{ background: "var(--secondary)" }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">Proteínas (g/100g)</label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={manualProt100}
                        onChange={(e) => setManualProt100(e.target.value)}
                        style={{ background: "var(--secondary)" }}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">Carboidratos (g/100g)</label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={manualCarbo100}
                        onChange={(e) => setManualCarbo100(e.target.value)}
                        style={{ background: "var(--secondary)" }}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">Gorduras (g/100g)</label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={manualGord100}
                        onChange={(e) => setManualGord100(e.target.value)}
                        style={{ background: "var(--secondary)" }}
                      />
                    </div>
                    <div>
                      <div className="h-full flex items-end">
                        <Button variant="outline" className="w-full gap-2" onClick={openScanner}>
                          <Camera className="w-4 h-4" /> Voltar
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <Button
                      className="flex-1 gap-2 font-semibold neon-glow"
                      style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                      onClick={handleManualAdd}
                      disabled={!manualName.trim()}
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar à Refeição
                    </Button>
                    <Button variant="outline" onClick={handleClose}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
