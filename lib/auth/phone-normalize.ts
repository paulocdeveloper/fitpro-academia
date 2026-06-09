/** Normaliza telefone para apenas dígitos (BR: remove +55, espaços, máscaras). */
export function normalizePhone(input: string): string {
  let digits = input.replace(/\D/g, "")
  if (digits.startsWith("55") && digits.length >= 12) {
    digits = digits.slice(2)
  }
  return digits
}

export function isValidPhone(input: string): boolean {
  const d = normalizePhone(input)
  return d.length >= 10 && d.length <= 11
}

export function maskPhone(input: string): string {
  const d = normalizePhone(input)
  if (d.length < 4) return "****"
  return `(${d.slice(0, 2)}) *****-${d.slice(-4)}`
}
