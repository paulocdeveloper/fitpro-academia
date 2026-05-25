import type { PerfilTreinoInteligente } from "@/lib/treino-inteligente/generator"
import {
  normalizeGorduraOpcional,
  normalizePerfil,
  parseNumeroCampo,
} from "@/lib/treino-inteligente/perfil-schema"

export type PerfilFormStrings = {
  pesoStr: string
  alturaStr: string
  idadeStr: string
  freqStr: string
  gorduraStr: string
}

/** Monta payload numérico a partir do estado do formulário (evita NaN e strings soltas). */
export function buildPerfilFromForm(
  perfil: PerfilTreinoInteligente,
  strings: PerfilFormStrings,
): PerfilTreinoInteligente {
  return normalizePerfil({
    ...perfil,
    peso_kg: parseNumeroCampo(strings.pesoStr),
    altura_cm: parseNumeroCampo(strings.alturaStr),
    idade: parseNumeroCampo(strings.idadeStr),
    frequencia_semanal: parseNumeroCampo(strings.freqStr),
    percentual_gordura: normalizeGorduraOpcional(strings.gorduraStr),
    limitacoes: perfil.limitacoes?.trim() ? perfil.limitacoes.trim() : null,
  })
}

/** Logs temporários de diagnóstico (Safari / produção). */
export function logPerfilSubmit(step: string, payload: Record<string, unknown>) {
  if (typeof console === "undefined") return
  console.info("[perfil-submit]", step, payload)
}
