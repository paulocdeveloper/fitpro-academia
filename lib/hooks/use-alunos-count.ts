"use client"

import { useEffect, useState } from "react"

export const ALUNOS_CHANGED_EVENT = "fitpro:alunos-changed"

function fetchAlunosCount(): Promise<number | null> {
  return fetch("/api/alunos", { credentials: "include" })
    .then(async (res) => {
      if (res.status === 401 || !res.ok) return null
      const data = (await res.json()) as unknown
      return Array.isArray(data) ? data.length : null
    })
    .catch(() => null)
}

/**
 * Total de alunos (GET /api/alunos). Atualiza ao mudar `refetchKey` (ex.: pathname)
 * e quando outra parte do app dispara `fitpro:alunos-changed`.
 */
export function useAlunosCount(refetchKey: string | number = 0) {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchAlunosCount().then((n) => {
      if (!cancelled) setCount(n)
    })
    return () => {
      cancelled = true
    }
  }, [refetchKey])

  useEffect(() => {
    const onChange = () => {
      void fetchAlunosCount().then(setCount)
    }
    window.addEventListener(ALUNOS_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(ALUNOS_CHANGED_EVENT, onChange)
  }, [])

  return count
}
