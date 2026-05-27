"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Bot, Loader2, Send, Sparkles, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ChatMessage, FitnessUserContext } from "@/lib/fitness-ai/types"

type Props = {
  className?: string
  compact?: boolean
}

export function FitnessCoachChat({ className, compact = false }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [context, setContext] = useState<FitnessUserContext | null>(null)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [bootLoading, setBootLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadContext = useCallback(async () => {
    setBootLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/fitness-ai/context", { credentials: "include" })
      const data = await res.json()
      if (res.status === 402) {
        window.location.href = "/premium"
        return
      }
      if (!res.ok) throw new Error(data.error ?? "Erro ao carregar coach")
      setContext(data.context ?? null)
      setMessages(Array.isArray(data.messages) ? data.messages : [])
      if (!data.messages?.length && data.context) {
        const nome = (data.context.displayName as string)?.split(" ")[0] ?? "atleta"
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: `Olá, ${nome}! Sou seu **Coach FitPro**. Seu foco é **${data.context.objetivo}**. Pergunte sobre treino, nutrição, macros ou evolução — uso seu perfil para personalizar.`,
            createdAt: new Date().toISOString(),
          },
        ])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro de conexão")
    } finally {
      setBootLoading(false)
    }
  }, [])

  useEffect(() => {
    loadContext()
  }, [loadContext])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput("")
    setLoading(true)
    setError(null)

    const optimistic: ChatMessage = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    }
    setMessages((m) => [...m, optimistic])

    try {
      const res = await fetch("/api/fitness-ai/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      })
      const data = await res.json()
      if (res.status === 402) {
        window.location.href = "/premium"
        return
      }
      if (!res.ok) throw new Error(data.error ?? "Erro ao enviar")
      if (Array.isArray(data.messages)) {
        setMessages(data.messages)
      } else if (data.reply) {
        setMessages((m) => [
          ...m.filter((x) => x.id !== optimistic.id),
          optimistic,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: data.reply,
            createdAt: new Date().toISOString(),
          },
        ])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro")
      setMessages((m) => m.filter((x) => x.id !== optimistic.id))
      setInput(text)
    } finally {
      setLoading(false)
    }
  }

  const height = compact ? "min-h-[320px] max-h-[420px]" : "min-h-[400px] max-h-[560px]"

  return (
    <div
      className={`metric-card rounded-xl flex flex-col overflow-hidden ${className ?? ""}`}
      style={{ border: "1px solid var(--border)" }}
    >
      <div
        className="flex items-center gap-2 px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--neon-dim)" }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center neon-glow"
          style={{ background: "var(--primary)" }}
        >
          <Bot className="w-4 h-4" style={{ color: "var(--primary-foreground)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm" style={{ fontFamily: "var(--font-space-grotesk)" }}>
            Coach IA FitPro
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            {context
              ? `${context.objetivo} · ${context.nivel}${context.imc ? ` · IMC ${context.imc}` : ""}`
              : "Carregando contexto…"}
          </p>
        </div>
        <span
          className="text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
          style={{ background: "var(--primary)25", color: "var(--primary)" }}
        >
          Premium IA
        </span>
      </div>

      <div ref={scrollRef} className={`flex-1 overflow-y-auto p-4 space-y-3 ${height}`}>
        {bootLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando memória do coach…
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: m.role === "user" ? "var(--secondary)" : "var(--neon-dim)",
                }}
              >
                {m.role === "user" ? (
                  <User className="w-3.5 h-3.5" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 neon-text" />
                )}
              </div>
              <div
                className="rounded-xl px-3 py-2 text-sm max-w-[85%] leading-relaxed"
                style={{
                  background: m.role === "user" ? "var(--primary)" : "var(--secondary)",
                  color: m.role === "user" ? "var(--primary-foreground)" : "var(--foreground)",
                }}
              >
                {m.content.split("\n").map((line, i) => (
                  <p key={i} className={i > 0 ? "mt-2" : ""}>
                    {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
                      part.startsWith("**") && part.endsWith("**") ? (
                        <strong key={j}>{part.slice(2, -2)}</strong>
                      ) : (
                        part
                      ),
                    )}
                  </p>
                ))}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Coach pensando…
          </div>
        )}
      </div>

      {error && (
        <p className="px-4 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      <form
        className="p-3 flex gap-2 shrink-0"
        style={{ borderTop: "1px solid var(--border)" }}
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <Input
          placeholder="Pergunte ao coach…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading || bootLoading}
          className="flex-1 bg-secondary"
        />
        <Button
          type="submit"
          size="icon"
          disabled={loading || bootLoading || !input.trim()}
          className="neon-glow shrink-0"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  )
}
