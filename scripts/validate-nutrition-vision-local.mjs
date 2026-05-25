/**
 * Valida schema/parsing local da Vision (sem chamar OpenAI).
 * npx tsx scripts/validate-nutrition-vision-local.mjs
 */
import { filterValidItems, normalizeMacroItem } from "../lib/nutrition/validate-macros.ts"
import { stripDataUrl, toVisionDataUrl } from "../lib/nutrition/image-upload.ts"

let failed = 0
function ok(label, cond) {
  if (!cond) {
    console.error("✗", label)
    failed++
    return
  }
  console.log("✓", label)
}

const item = normalizeMacroItem(
  {
    nome: "Arroz branco",
    categoria: "carboidrato",
    categorias: ["carboidrato"],
    quantidade_g: 150,
    confianca: 85,
    kcal: 195,
    proteinas_g: 4,
    carboidratos_g: 42,
    gorduras_g: 1,
    fibras_g: 1,
  },
  80,
)
ok("normaliza item brasileiro", item?.nome === "Arroz branco")

const items = filterValidItems(
  item
    ? [
        item,
        normalizeMacroItem(
          {
            nome: "Peito de frango grelhado",
            categoria: "proteina",
            categorias: ["proteina"],
            quantidade_g: 120,
            confianca: 78,
            kcal: 198,
            proteinas_g: 37,
            carboidratos_g: 0,
            gorduras_g: 4,
            fibras_g: 0,
          },
          80,
        ),
      ].filter(Boolean)
    : [],
)
ok("múltiplos alimentos no prato", items.length === 2)

ok("data URL vision", toVisionDataUrl(stripDataUrl("abc")).startsWith("data:image/jpeg"))

if (failed) process.exit(1)
console.log("\nVision local OK")
