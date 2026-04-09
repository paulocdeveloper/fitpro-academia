"use client"

import { useMemo, useState, useRef, useEffect, useCallback } from "react"
import { Camera, X, ScanLine, RefreshCw, Zap, Plus, Pencil, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type FoodPer100g = {
  nome: string
  kcal_100g: number
  proteinas_100g: number
  carbos_100g: number
  gorduras_100g: number
}

export type ScannedFood = {
  nome: string
  quantidade_g: number
  calorias_kcal: number
  proteinas_g: number
  carboidratos_g: number
  gorduras_g: number
}

type ScannerState = "idle" | "camera" | "scanning" | "detected" | "not_found" | "manual"

const ALIMENTOS_SIMULADOS: { nome: string }[] = [
  { nome: "Frango grelhado" },
  { nome: "Arroz branco cozido" },
  { nome: "Ovo cozido" },
  { nome: "Banana" },
  { nome: "Feijão cozido" },
  { nome: "Macarrão cozido" },
  { nome: "Carne moída cozida (média gordura)" },
]

function MacroBadge({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl p-3 gap-0.5"
      style={{ background: `${color}18`, border: `1px solid ${color}30` }}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-bold text-base" style={{ color, fontFamily: "var(--font-space-grotesk)" }}>
        {value}
        <span className="text-xs font-normal ml-0.5">{unit}</span>
      </span>
    </div>
  )
}

export function FoodScanner({ onAddFood }: { onAddFood?: (food: ScannedFood) => void }) {
  const [state, setState] = useState<ScannerState>("idle")
  const [detectedName, setDetectedName] = useState<string | null>(null)
  const [matches, setMatches] = useState<FoodPer100g[]>([])
  const [matchesLoading, setMatchesLoading] = useState(false)
  const [matchesError, setMatchesError] = useState<string | null>(null)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [grams, setGrams] = useState("150")

  const [manualName, setManualName] = useState("")
  const [manualGrams, setManualGrams] = useState("150")
  const [manualKcal100, setManualKcal100] = useState("")
  const [manualProt100, setManualProt100] = useState("")
  const [manualCarbo100, setManualCarbo100] = useState("")
  const [manualGord100, setManualGord100] = useState("")
  const [cameraError, setCameraError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  function getCameraErrorMessage(e: unknown): string {
    const err = e as { name?: string; message?: string }
    const name = typeof err?.name === "string" ? err.name : ""

    // Bloqueios comuns: permissões, ausência de câmera, câmera em uso.
    if (name === "NotAllowedError" || name === "SecurityError") {
      return "Permissão negada. Libere a câmera nas permissões do navegador e tente novamente."
    }
    if (name === "NotFoundError") {
      return "Nenhuma câmera encontrada no dispositivo."
    }
    if (name === "NotReadableError" || name === "TrackStartError") {
      return "Câmera indisponível (pode estar em uso por outro app). Feche outros apps que usam câmera e tente novamente."
    }
    if (name === "OverconstrainedError") {
      return "Não foi possível usar a câmera traseira. Tentando outra câmera pode resolver."
    }

    // Requisito do navegador: precisa ser localhost ou HTTPS.
    if (typeof window !== "undefined") {
      const host = window.location.hostname
      const okHost = host === "localhost" || host === "127.0.0.1" || host === "::1"
      if (!window.isSecureContext && !okHost) {
        return `O navegador bloqueou a câmera em HTTP (${host}). Use localhost/127.0.0.1 ou HTTPS.`
      }
    }

    const msg = typeof err?.message === "string" ? err.message : ""
    return msg ? `Não foi possível abrir a câmera. (${msg})` : "Não foi possível abrir a câmera."
  }

  async function tryGetUserMedia(constraints: MediaStreamConstraints) {
    return await navigator.mediaDevices.getUserMedia(constraints)
  }

  const startCamera = async () => {
    stopCamera()
    setCameraError(null)
    setState("camera")

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError("Seu navegador não suporta acesso à câmera (getUserMedia).")
      return
    }

    if (typeof window !== "undefined") {
      const host = window.location.hostname
      const okHost = host === "localhost" || host === "127.0.0.1" || host === "::1"
      if (!window.isSecureContext && !okHost) {
        setCameraError(`O navegador bloqueou a câmera em HTTP (${host}). Use localhost/127.0.0.1 ou HTTPS.`)
        return
      }
    }

    try {
      // 1) tenta câmera traseira (mobile)
      let stream: MediaStream
      try {
        stream = await tryGetUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        })
      } catch (e1) {
        // 2) fallback: câmera frontal
        try {
          stream = await tryGetUserMedia({
            audio: false,
            video: { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          })
        } catch (e2) {
          // 3) fallback: qualquer câmera
          stream = await tryGetUserMedia({
            audio: false,
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          }).catch(() => {
            throw e2
          })
        }
      }

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await new Promise<void>((resolve) => {
          const v = videoRef.current
          if (!v) return resolve()
          if (v.readyState >= 1) return resolve()
          const onLoaded = () => resolve()
          v.addEventListener("loadedmetadata", onLoaded, { once: true })
        })
        await videoRef.current.play().catch(() => {
          // alguns navegadores podem falhar no play mesmo com stream ok
        })
      }
    } catch (e) {
      setCameraError(getCameraErrorMessage(e))
    }
  }

  const simulateScanResult = () => {
    // Simula IA com 85% de chance de detectar
    setTimeout(() => {
      const sucesso = Math.random() > 0.15
      if (sucesso) {
        const alimento = ALIMENTOS_SIMULADOS[Math.floor(Math.random() * ALIMENTOS_SIMULADOS.length)]
        setDetectedName(alimento.nome)
        setState("detected")
      } else {
        setState("not_found")
      }
    }, 2200)
  }

  const captureAndScan = () => {
    setState("scanning")
    // captura frame no canvas
    if (canvasRef.current && videoRef.current) {
      const ctx = canvasRef.current.getContext("2d")
      canvasRef.current.width = videoRef.current.videoWidth
      canvasRef.current.height = videoRef.current.videoHeight
      ctx?.drawImage(videoRef.current, 0, 0)
    }
    stopCamera()
    simulateScanResult()
  }

  const pickImage = () => fileInputRef.current?.click()

  const handlePickedImage = async (file: File) => {
    setCameraError(null)
    setState("scanning")
    stopCamera()

    try {
      const url = URL.createObjectURL(file)
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error("Falha ao carregar a imagem."))
        img.src = url
      })

      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d")
        canvasRef.current.width = img.naturalWidth || img.width
        canvasRef.current.height = img.naturalHeight || img.height
        ctx?.drawImage(img, 0, 0)
      }

      URL.revokeObjectURL(url)
      simulateScanResult()
    } catch (e) {
      setState("camera")
      setCameraError(e instanceof Error ? e.message : "Falha ao processar a imagem.")
    }
  }

  const selectedFood = useMemo(() => matches[selectedIdx] ?? null, [matches, selectedIdx])
  const computed = useMemo(() => {
    const g = Number(grams)
    if (!selectedFood || !Number.isFinite(g) || g <= 0) return null
    const mult = g / 100
    const kcal = Math.round(selectedFood.kcal_100g * mult)
    const p = Number((selectedFood.proteinas_100g * mult).toFixed(1))
    const c = Number((selectedFood.carbos_100g * mult).toFixed(1))
    const fat = Number((selectedFood.gorduras_100g * mult).toFixed(1))
    return { g, kcal, p, c, fat }
  }, [grams, selectedFood])

  const handleConfirm = () => {
    if (!selectedFood || !computed) return
    onAddFood?.({
      nome: selectedFood.nome,
      quantidade_g: computed.g,
      calorias_kcal: computed.kcal,
      proteinas_g: computed.p,
      carboidratos_g: computed.c,
      gorduras_g: computed.fat,
    } satisfies ScannedFood as any)
    setState("idle")
    setDetectedName(null)
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
    setState("idle")
    setManualName("")
    setManualGrams("150")
    setManualKcal100("")
    setManualProt100("")
    setManualCarbo100("")
    setManualGord100("")
  }

  const handleClose = () => {
    stopCamera()
    setState("idle")
    setDetectedName(null)
    setCameraError(null)
  }

  useEffect(() => () => stopCamera(), [stopCamera])

  useEffect(() => {
    if (state !== "detected" || !detectedName) return
    let cancelled = false
    setMatchesLoading(true)
    setMatchesError(null)
    setMatches([])
    setSelectedIdx(0)
    ;(async () => {
      try {
        const res = await fetch(`/api/nutrition/alimentos?query=${encodeURIComponent(detectedName)}`, {
          credentials: "include",
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          const msg = typeof data?.error === "string" ? data.error : "Não foi possível buscar alimentos."
          throw new Error(msg)
        }
        if (!cancelled) {
          setMatches(Array.isArray(data) ? (data as FoodPer100g[]) : [])
          if (Array.isArray(data) && data.length > 0) {
            setGrams("150")
          }
        }
      } catch (e) {
        if (!cancelled) setMatchesError(e instanceof Error ? e.message : "Falha ao buscar alimentos.")
      } finally {
        if (!cancelled) setMatchesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [detectedName, state])

  return (
    <>
      {/* Botão de acionar */}
      <Button
        size="sm"
        className="gap-2 text-xs font-semibold neon-glow"
        style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        onClick={startCamera}
      >
        <Camera className="w-3.5 h-3.5" />
        Escanear Comida
      </Button>

      {/* Overlay modal */}
      {state !== "idle" && (
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
                    {state === "scanning" && "Analisando com IA..."}
                    {state === "detected" && "Alimento Detectado"}
                    {state === "not_found" && "Não Identificado"}
                    {state === "manual" && "Adicionar Manualmente"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {state === "camera" && "Aponte para o prato ou código de barras"}
                    {state === "scanning" && "Processando imagem..."}
                    {state === "detected" && "Confirme as informações nutricionais"}
                    {state === "not_found" && "Tente novamente ou insira manualmente"}
                    {state === "manual" && "Digite os dados do alimento"}
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

            {/* Corpo */}
            <div className="p-5 space-y-4">

              {/* CÂMERA */}
              {(state === "camera") && (
                <div className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      e.target.value = ""
                      if (f) void handlePickedImage(f)
                    }}
                  />
                  {cameraError ? (
                    <div
                      className="rounded-xl flex flex-col items-center justify-center gap-3 py-12 text-center"
                      style={{ background: "var(--secondary)", border: "1px dashed var(--border)" }}
                    >
                      <Camera className="w-10 h-10 text-muted-foreground" />
                      <div>
                        <p className="font-semibold text-sm">Câmera não disponível</p>
                        <p className="text-xs text-muted-foreground mt-1">{cameraError}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={startCamera} className="gap-1.5 mt-1">
                        <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
                      </Button>
                      <Button size="sm" onClick={pickImage} className="gap-1.5">
                        <ScanLine className="w-3.5 h-3.5" /> Enviar foto
                      </Button>
                    </div>
                  ) : (
                    <div className="relative rounded-xl overflow-hidden aspect-video bg-black">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                      <canvas ref={canvasRef} className="hidden" />
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
                      {/* hint badge */}
                      <div
                        className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs font-medium"
                        style={{ background: "oklch(0.05 0.005 260 / 0.75)", backdropFilter: "blur(4px)", color: "var(--foreground)" }}
                      >
                        Posicione o alimento no centro
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 gap-2 font-semibold neon-glow"
                      style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                      onClick={captureAndScan}
                      disabled={!!cameraError}
                    >
                      <Zap className="w-4 h-4" />
                      Capturar e Analisar
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={pickImage}>
                      <ScanLine className="w-4 h-4" />
                      Enviar foto
                    </Button>
                  </div>
                </div>
              )}

              {/* SCANNING */}
              {state === "scanning" && (
                <div className="flex flex-col items-center justify-center py-10 gap-5">
                  <div className="relative w-20 h-20">
                    <div
                      className="w-20 h-20 rounded-full border-2 animate-spin"
                      style={{ borderColor: "var(--border)", borderTopColor: "var(--primary)" }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Zap className="w-7 h-7 neon-text" />
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-semibold text-sm">IA processando imagem</p>
                    <p className="text-xs text-muted-foreground">Identificando alimentos e calculando macros...</p>
                  </div>
                  <div className="flex gap-1.5">
                    {["Detectando...", "Calculando macros...", "Finalizando..."].map((s, i) => (
                      <div
                        key={i}
                        className="h-1.5 w-12 rounded-full animate-pulse"
                        style={{
                          background: "var(--primary)",
                          animationDelay: `${i * 0.4}s`,
                          opacity: 0.4 + i * 0.2,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* DETECTED */}
              {state === "detected" && (
                <div className="space-y-4">
                  <div
                    className="flex items-center gap-3 p-4 rounded-xl"
                    style={{ background: "var(--neon-dim)", border: "1px solid var(--primary)30" }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 neon-glow"
                      style={{ background: "var(--primary)" }}
                    >
                      <Check className="w-5 h-5" style={{ color: "var(--primary-foreground)" }} />
                    </div>
                    <div>
                      <p className="font-bold" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                        {detectedName ?? "Alimento"}
                      </p>
                      <p className="text-xs text-muted-foreground">Selecione o alimento e informe a quantidade (g)</p>
                    </div>
                    {computed && (
                      <div className="ml-auto text-right">
                        <p className="font-bold text-lg neon-text" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                          {computed.kcal}
                        </p>
                        <p className="text-xs text-muted-foreground">kcal</p>
                      </div>
                    )}
                  </div>

                  {matchesLoading ? (
                    <p className="text-sm text-muted-foreground">Buscando alimentos…</p>
                  ) : matchesError ? (
                    <p className="text-sm text-destructive">{matchesError}</p>
                  ) : matches.length === 0 ? (
                    <div className="metric-card rounded-xl p-4">
                      <p className="text-sm font-semibold">Nenhum alimento encontrado</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Use “Inserir manual” para cadastrar macros por 100g.
                      </p>
                      <div className="mt-3">
                        <Button variant="outline" size="sm" onClick={() => setState("manual")} className="gap-2">
                          <Pencil className="w-4 h-4" /> Inserir manual
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground block">Alimento</label>
                        <select
                          className="w-full h-10 rounded-md px-3 text-sm"
                          style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
                          value={String(selectedIdx)}
                          onChange={(e) => setSelectedIdx(Number(e.target.value))}
                        >
                          {matches.map((m, idx) => (
                            <option key={`${m.nome}-${idx}`} value={String(idx)}>
                              {m.nome} — {m.kcal_100g} kcal/100g
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground block">Quantidade (g)</label>
                        <Input
                          type="number"
                          placeholder="150"
                          value={grams}
                          onChange={(e) => setGrams(e.target.value)}
                          style={{ background: "var(--secondary)" }}
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Dica: prato comum costuma variar entre 120g e 300g por item.
                        </p>
                      </div>

                      {computed && (
                        <div className="grid grid-cols-3 gap-2">
                          <MacroBadge label="Proteínas" value={computed.p} unit="g" color="oklch(0.7 0.22 145)" />
                          <MacroBadge label="Carboidratos" value={computed.c} unit="g" color="oklch(0.75 0.18 80)" />
                          <MacroBadge label="Gorduras" value={computed.fat} unit="g" color="oklch(0.65 0.2 200)" />
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex gap-3 pt-1">
                    <Button
                      className="flex-1 gap-2 font-semibold neon-glow"
                      style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                      onClick={handleConfirm}
                      disabled={!selectedFood || !computed}
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar à Refeição
                    </Button>
                    <Button variant="outline" className="flex-1 gap-2" onClick={handleClose}>
                      <X className="w-4 h-4" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {/* NOT FOUND */}
              {state === "not_found" && (
                <div className="space-y-4">
                  <div
                    className="rounded-xl flex flex-col items-center justify-center gap-3 py-8 text-center"
                    style={{ background: "var(--secondary)" }}
                  >
                    <Camera className="w-10 h-10 text-muted-foreground" />
                    <div>
                      <p className="font-semibold text-sm">Alimento não identificado</p>
                      <p className="text-xs text-muted-foreground mt-1">Tente capturar novamente ou adicione manualmente</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 gap-2" onClick={startCamera}>
                      <RefreshCw className="w-4 h-4" />
                      Tentar novamente
                    </Button>
                    <Button
                      className="flex-1 gap-2 font-semibold"
                      style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                      onClick={() => setState("manual")}
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
                        <Button variant="outline" className="w-full gap-2" onClick={() => setState("camera")}>
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
