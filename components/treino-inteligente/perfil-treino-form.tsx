"use client"

import { useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { PerfilTreinoInteligente } from "@/lib/treino-inteligente/generator"
import {
  NIVEIS_TREINO,
  OBJETIVOS_TREINO,
  SEXOS_TREINO,
  buildPerfilSubmitPayload,
  formatNumeroInput,
  logPerfilSubmit,
  normalizePerfil,
  parseNumeroCampo,
  validatePerfilClient,
  type PerfilFieldErrors,
} from "@/lib/treino-inteligente/perfil-schema"
import { Brain, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type PerfilTreinoFormProps = {
  perfil: PerfilTreinoInteligente
  onChange: (p: PerfilTreinoInteligente) => void
  onSave: (p: PerfilTreinoInteligente) => void | Promise<void>
  saving?: boolean
  className?: string
  showGordura?: boolean
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive">{message}</p>
}

export function PerfilTreinoForm({
  perfil,
  onChange,
  onSave,
  saving = false,
  className,
  showGordura = true,
}: PerfilTreinoFormProps) {
  const [errors, setErrors] = useState<PerfilFieldErrors>({})
  const [pesoStr, setPesoStr] = useState(() => formatNumeroInput(perfil.peso_kg))
  const [alturaStr, setAlturaStr] = useState(() => formatNumeroInput(perfil.altura_cm))
  const [idadeStr, setIdadeStr] = useState(() => formatNumeroInput(perfil.idade))
  const [freqStr, setFreqStr] = useState(() => formatNumeroInput(perfil.frequencia_semanal))
  const [gorduraStr, setGorduraStr] = useState(() => formatNumeroInput(perfil.percentual_gordura))

  const syncPerfil = useCallback(
    (patch: Partial<PerfilTreinoInteligente>) => {
      const next = normalizePerfil({ ...perfil, ...patch })
      onChange(next)
      return next
    },
    [onChange, perfil],
  )

  const validateInstant = useCallback((draft: PerfilTreinoInteligente) => {
    const { ok, fieldErrors } = validatePerfilClient(draft)
    setErrors(ok ? {} : fieldErrors)
    return ok
  }, [])

  const handlePeso = (raw: string) => {
    const masked = raw.replace(/[^\d.,]/g, "")
    setPesoStr(masked)
    const n = parseNumeroCampo(masked)
    const next = syncPerfil({ peso_kg: n ?? perfil.peso_kg })
    validateInstant(next)
  }

  const handleAltura = (raw: string) => {
    const masked = raw.replace(/[^\d.,]/g, "")
    setAlturaStr(masked)
    const n = parseNumeroCampo(masked)
    const next = syncPerfil({ altura_cm: n ?? perfil.altura_cm })
    validateInstant(next)
  }

  const handleIdade = (raw: string) => {
    const masked = raw.replace(/\D/g, "")
    setIdadeStr(masked)
    const n = parseNumeroCampo(masked)
    const next = syncPerfil({ idade: n ?? perfil.idade })
    validateInstant(next)
  }

  const handleFreq = (raw: string) => {
    const masked = raw.replace(/\D/g, "").slice(0, 1)
    setFreqStr(masked)
    const n = parseNumeroCampo(masked)
    const next = syncPerfil({ frequencia_semanal: n ?? perfil.frequencia_semanal })
    validateInstant(next)
  }

  const handleGordura = (raw: string) => {
    const masked = raw.replace(/[^\d.,]/g, "")
    setGorduraStr(masked)
    const n = parseNumeroCampo(masked)
    const next = syncPerfil({ percentual_gordura: n === undefined ? null : n })
    validateInstant(next)
  }

  async function handleSave() {
    const draft = buildPerfilSubmitPayload(
      { pesoStr, alturaStr, idadeStr, freqStr, gorduraStr },
      perfil,
    )
    logPerfilSubmit("submit-draft", draft, { pesoStr, alturaStr, idadeStr, freqStr, gorduraStr })

    const { ok, fieldErrors, message } = validatePerfilClient(draft)
    if (!ok) {
      logPerfilSubmit("submit-validation-failed", fieldErrors, { message })
      setErrors(fieldErrors)
      toast.error(message ?? "Corrija os campos destacados.")
      return
    }
    setErrors({})
    onChange(draft)
    logPerfilSubmit("submit-ok", draft)
    await onSave(draft)
  }

  const sexoValue = SEXOS_TREINO.includes(perfil.sexo) ? perfil.sexo : undefined
  const nivelValue = NIVEIS_TREINO.includes(perfil.nivel) ? perfil.nivel : undefined
  const objetivoValue = OBJETIVOS_TREINO.includes(
    perfil.objetivo as (typeof OBJETIVOS_TREINO)[number],
  )
    ? (perfil.objetivo as (typeof OBJETIVOS_TREINO)[number])
    : normalizePerfil(perfil).objetivo

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", className)}>
      <div className="space-y-2">
        <Label htmlFor="peso-kg">Peso (kg)</Label>
        <Input
          id="peso-kg"
          type="text"
          inputMode="decimal"
          enterKeyHint="next"
          autoComplete="off"
          placeholder="Ex.: 75"
          value={pesoStr}
          onChange={(e) => handlePeso(e.target.value)}
          onBlur={() => validateInstant(normalizePerfil(perfil))}
          aria-invalid={!!errors.peso_kg}
          className={errors.peso_kg ? "border-destructive" : undefined}
        />
        <FieldError message={errors.peso_kg} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="altura-cm">Altura (cm)</Label>
        <Input
          id="altura-cm"
          type="text"
          inputMode="numeric"
          enterKeyHint="next"
          autoComplete="off"
          placeholder="Ex.: 175"
          value={alturaStr}
          onChange={(e) => handleAltura(e.target.value)}
          onBlur={() => validateInstant(normalizePerfil(perfil))}
          aria-invalid={!!errors.altura_cm}
          className={errors.altura_cm ? "border-destructive" : undefined}
        />
        <FieldError message={errors.altura_cm} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="idade">Idade</Label>
        <Input
          id="idade"
          type="text"
          inputMode="numeric"
          enterKeyHint="next"
          autoComplete="off"
          placeholder="Ex.: 28"
          value={idadeStr}
          onChange={(e) => handleIdade(e.target.value)}
          onBlur={() => validateInstant(normalizePerfil(perfil))}
          aria-invalid={!!errors.idade}
          className={errors.idade ? "border-destructive" : undefined}
        />
        <FieldError message={errors.idade} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="frequencia">Frequência (x/semana)</Label>
        <Input
          id="frequencia"
          type="text"
          inputMode="numeric"
          enterKeyHint="next"
          autoComplete="off"
          placeholder="2 a 6"
          value={freqStr}
          onChange={(e) => handleFreq(e.target.value)}
          onBlur={() => validateInstant(normalizePerfil(perfil))}
          aria-invalid={!!errors.frequencia_semanal}
          className={errors.frequencia_semanal ? "border-destructive" : undefined}
        />
        <FieldError message={errors.frequencia_semanal} />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Objetivo</Label>
        <Select
          value={objetivoValue}
          onValueChange={(v) => {
            const next = syncPerfil({ objetivo: v })
            validateInstant(next)
          }}
        >
          <SelectTrigger aria-invalid={!!errors.objetivo} className={errors.objetivo ? "border-destructive" : undefined}>
            <SelectValue placeholder="Selecione o objetivo" />
          </SelectTrigger>
          <SelectContent>
            {OBJETIVOS_TREINO.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError message={errors.objetivo} />
      </div>
      <div className="space-y-2">
        <Label>Nível</Label>
        <Select
          value={nivelValue}
          onValueChange={(v) => {
            const next = syncPerfil({ nivel: v as PerfilTreinoInteligente["nivel"] })
            validateInstant(next)
          }}
        >
          <SelectTrigger aria-invalid={!!errors.nivel} className={errors.nivel ? "border-destructive" : undefined}>
            <SelectValue placeholder="Selecione o nível" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="iniciante">Iniciante</SelectItem>
            <SelectItem value="intermediario">Intermediário</SelectItem>
            <SelectItem value="avancado">Avançado</SelectItem>
          </SelectContent>
        </Select>
        <FieldError message={errors.nivel} />
      </div>
      <div className="space-y-2">
        <Label>Sexo</Label>
        <Select
          value={sexoValue}
          onValueChange={(v) => {
            const next = syncPerfil({ sexo: v as PerfilTreinoInteligente["sexo"] })
            validateInstant(next)
          }}
        >
          <SelectTrigger aria-invalid={!!errors.sexo} className={errors.sexo ? "border-destructive" : undefined}>
            <SelectValue placeholder="Selecione o sexo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="masculino">Masculino</SelectItem>
            <SelectItem value="feminino">Feminino</SelectItem>
            <SelectItem value="outro">Outro</SelectItem>
          </SelectContent>
        </Select>
        <FieldError message={errors.sexo} />
      </div>
      {showGordura && (
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="gordura">% Gordura (opcional)</Label>
          <Input
            id="gordura"
            type="text"
            inputMode="decimal"
            enterKeyHint="done"
            autoComplete="off"
            placeholder="Deixe vazio se não souber"
            value={gorduraStr}
            onChange={(e) => handleGordura(e.target.value)}
            onBlur={() => validateInstant(normalizePerfil(perfil))}
            aria-invalid={!!errors.percentual_gordura}
            className={errors.percentual_gordura ? "border-destructive" : undefined}
          />
          <FieldError message={errors.percentual_gordura} />
        </div>
      )}
      <div className="space-y-2 sm:col-span-2">
        <Label>Limitações físicas (opcional)</Label>
        <Textarea
          value={perfil.limitacoes ?? ""}
          onChange={(e) => {
            const v = e.target.value
            const next = syncPerfil({ limitacoes: v.trim() ? v : null })
            if (errors.limitacoes) validateInstant(next)
          }}
          placeholder="Ex.: joelho, lombar…"
        />
        <FieldError message={errors.limitacoes} />
      </div>
      <Button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="gap-2 sm:col-span-2"
      >
        {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
        Salvar e recalcular treino
      </Button>
    </div>
  )
}
