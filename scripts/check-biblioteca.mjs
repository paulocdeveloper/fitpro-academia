import { BIBLIOTECA_EXERCICIOS, countBibliotecaPorGrupo } from "../lib/biblioteca-from-programas.ts"

const all = BIBLIOTECA_EXERCICIOS
const c = countBibliotecaPorGrupo()
console.log("TOTAL", all.length)
console.log("Por grupo", c)
console.log(
  "Peito + Intermediário",
  all.filter((e) => e.grupo === "Peito" && e.nivel === "Intermediário").length,
)
