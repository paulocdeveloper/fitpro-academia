/**
 * Testes do schema de perfil IA Treino (Safari-safe).
 * Uso: node scripts/perfil-schema.test.mjs
 */
import assert from "node:assert/strict"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)

// Compila TS on-the-fly via tsx se disponível; senão importa build — usamos import dinâmico do .ts via tsx
async function loadSchema() {
  try {
    const { register } = await import("tsx/esm/api")
    register()
    return await import("../lib/treino-inteligente/perfil-schema.ts")
  } catch {
    console.error("Instale tsx ou rode após build. Tentando import direto…")
    return await import("../lib/treino-inteligente/perfil-schema.ts")
  }
}

const schema = await loadSchema()
const {
  validatePerfilPut,
  buildPerfilSubmitPayload,
  parseNumeroCampo,
  normalizePerfil,
} = schema

const base = {
  peso_kg: 67,
  altura_cm: 168,
  idade: 23,
  sexo: "outro",
  objetivo: "Hipertrofia",
  nivel: "iniciante",
  frequencia_semanal: 4,
  limitacoes: null,
  percentual_gordura: null,
}

// Caso do screenshot (Safari / produção)
const screenshot = validatePerfilPut({
  peso_kg: "67",
  altura_cm: "168",
  idade: "23",
  frequencia_semanal: "4",
  sexo: "Outro",
  nivel: "Iniciante",
  objetivo: "Hipertrofia",
  percentual_gordura: "67",
})
assert.equal(screenshot.ok, false, "gordura 67 deve falhar")
assert.match(
  screenshot.fieldErrors.percentual_gordura ?? "",
  /gordura/i,
  "erro amigável em % gordura",
)

const okStrings = validatePerfilPut({
  peso_kg: "67",
  altura_cm: "168",
  idade: "23",
  frequencia_semanal: "4",
  sexo: "outro",
  nivel: "iniciante",
  objetivo: "Hipertrofia",
  percentual_gordura: "",
})
assert.equal(okStrings.ok, true, "strings numéricas válidas")

const payload = buildPerfilSubmitPayload(
  {
    pesoStr: "67,5",
    alturaStr: "168",
    idadeStr: "23",
    freqStr: "4",
    gorduraStr: "",
  },
  normalizePerfil(base),
)
assert.equal(payload.peso_kg, 67.5, "vírgula decimal BR")
assert.equal(payload.percentual_gordura, null, "gordura vazia → null")

assert.equal(parseNumeroCampo("abc"), undefined)
assert.equal(parseNumeroCampo(NaN), undefined)

console.log("✓ perfil-schema.test.mjs — todos os testes passaram")
