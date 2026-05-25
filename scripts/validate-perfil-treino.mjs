/**
 * Valida schema do perfil IA Treino (números, enums, gordura opcional).
 * Uso: npx tsx scripts/validate-perfil-treino.mjs
 */
import { validatePerfilPut, normalizePerfil } from "../lib/treino-inteligente/perfil-schema.ts"

let failed = 0

function assert(label, cond) {
  if (!cond) {
    console.error("✗", label)
    failed++
    return
  }
  console.log("✓", label)
}

const valid = validatePerfilPut({
  peso_kg: "67",
  altura_cm: "168",
  idade: "23",
  frequencia_semanal: "4",
  sexo: "Outro",
  objetivo: "Hipertrofia",
  nivel: "Iniciante",
  percentual_gordura: null,
})
assert("strings + enums capitalizados", valid.ok)

const gorduraOpcional = validatePerfilPut({
  peso_kg: 67,
  altura_cm: 168,
  idade: 23,
  frequencia_semanal: 4,
  sexo: "outro",
  objetivo: "Hipertrofia",
  nivel: "iniciante",
  percentual_gordura: 67,
})
assert("gordura 67 aceita (opcional)", gorduraOpcional.ok && gorduraOpcional.data.percentual_gordura === 67)

const gorduraVazia = validatePerfilPut({
  peso_kg: 67,
  altura_cm: 168,
  idade: 23,
  frequencia_semanal: 4,
  sexo: "outro",
  objetivo: "Hipertrofia",
  nivel: "iniciante",
})
assert("sem gordura → null", gorduraVazia.ok && gorduraVazia.data.percentual_gordura === null)

const gorduraLixo = validatePerfilPut({
  peso_kg: 70,
  altura_cm: 170,
  idade: 25,
  frequencia_semanal: 3,
  sexo: "feminino",
  objetivo: "Saúde",
  nivel: "iniciante",
  percentual_gordura: "abc",
})
assert("gordura inválida → null sem erro", gorduraLixo.ok && gorduraLixo.data.percentual_gordura === null)

const legacy = validatePerfilPut({
  peso: "80",
  altura: "180",
  idade: 30,
  frequencia: 5,
  sexo: "masculino",
  objetivo: "Força",
  nivel: "avancado",
})
assert("chaves legadas peso/altura/frequencia", legacy.ok)

const nanPeso = validatePerfilPut({
  peso_kg: "abc",
  altura_cm: 170,
  idade: 25,
  frequencia_semanal: 3,
  sexo: "feminino",
  objetivo: "Saúde",
  nivel: "iniciante",
})
assert("peso inválido rejeitado", !nanPeso.ok)

const normalized = normalizePerfil({ sexo: "Outro", objetivo: "hipertrofia", nivel: "Intermediário" })
assert("normalize sexo/outro e nível", normalized.sexo === "outro" && normalized.nivel === "intermediario")

if (failed > 0) {
  console.error(`\n${failed} falha(s)`)
  process.exit(1)
}
console.log("\nPerfil IA Treino: validação OK")
