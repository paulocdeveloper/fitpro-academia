import type { PerfilTreinoInteligente } from "@/lib/treino-inteligente/generator"
import { logPerfilSubmit } from "@/lib/treino-inteligente/perfil-payload"
import {
  PerfilSaveError,
  friendlyFetchError,
  normalizePerfil,
  type PerfilFieldErrors,
} from "@/lib/treino-inteligente/perfil-schema"

export type SalvarPerfilResult = {
  perfil: PerfilTreinoInteligente
  treino?: unknown
}

export async function salvarPerfilTreinoApi(
  draft: PerfilTreinoInteligente,
): Promise<SalvarPerfilResult> {
  logPerfilSubmit("request", {
    peso_kg: draft.peso_kg,
    altura_cm: draft.altura_cm,
    idade: draft.idade,
    frequencia_semanal: draft.frequencia_semanal,
    sexo: draft.sexo,
    nivel: draft.nivel,
    objetivo: draft.objetivo,
    percentual_gordura: draft.percentual_gordura,
  })

  let res: Response
  try {
    res = await fetch("/api/treino-inteligente", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    })
  } catch (e) {
    logPerfilSubmit("fetch-error", { message: friendlyFetchError(e) })
    throw new PerfilSaveError(friendlyFetchError(e))
  }

  let data: {
    error?: string
    perfil?: PerfilTreinoInteligente
    treino?: unknown
    fieldErrors?: PerfilFieldErrors
  }
  try {
    data = await res.json()
  } catch {
    logPerfilSubmit("json-error", { status: res.status })
    throw new PerfilSaveError(
      res.ok ? "Resposta inválida do servidor." : `Erro ao salvar (${res.status}).`,
    )
  }

  logPerfilSubmit("response", { status: res.status, ok: res.ok, fieldErrors: data.fieldErrors })

  if (!res.ok) {
    const detail =
      data && typeof data === "object" && "detail" in data && typeof data.detail === "string"
        ? data.detail
        : undefined
    const msg =
      data.error ??
      Object.values(data.fieldErrors ?? {})[0] ??
      (res.status === 503
        ? "Servidor em manutenção. Tente em alguns minutos."
        : "Não foi possível salvar o perfil.")
    throw new PerfilSaveError(detail ? `${msg}` : msg, data.fieldErrors ?? {})
  }

  return {
    perfil: normalizePerfil(data.perfil ?? draft),
    treino: data.treino,
  }
}
