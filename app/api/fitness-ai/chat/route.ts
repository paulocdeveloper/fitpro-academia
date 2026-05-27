import { NextResponse } from "next/server"
import { requireFitnessCoach } from "@/lib/api/require-fitness-coach"
import { buildFitnessUserContext } from "@/lib/fitness-ai/context"
import { buildSystemPrompt, messagesForOpenAI } from "@/lib/fitness-ai/prompts"
import { completeFitnessChat, localCoachFallback } from "@/lib/fitness-ai/openai-chat"
import { loadChatHistory, saveChatHistory } from "@/lib/fitness-ai/memory-store"
import type { ChatMessage } from "@/lib/fitness-ai/types"

function newId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export async function POST(req: Request) {
  const auth = await requireFitnessCoach(req)
  if (!auth.ok) return auth.response

  let body: { message?: string }
  try {
    body = (await req.json()) as { message?: string }
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  const message = typeof body.message === "string" ? body.message.trim() : ""
  if (!message || message.length > 4000) {
    return NextResponse.json({ error: "Mensagem inválida." }, { status: 400 })
  }

  const ctx = await buildFitnessUserContext(auth.session)
  const history = await loadChatHistory(auth.session.userId, auth.session.academiaId)
  const system = buildSystemPrompt(ctx)
  const openaiMessages = messagesForOpenAI(system, history, message)

  let reply: string
  let engine: "openai" | "local" = "openai"
  let model: string | undefined

  const outcome = await completeFitnessChat(openaiMessages)
  if (outcome.ok) {
    reply = outcome.reply
    model = outcome.model
  } else {
    engine = "local"
    reply = localCoachFallback(message, ctx)
  }

  const now = new Date().toISOString()
  const userMsg: ChatMessage = { id: newId(), role: "user", content: message, createdAt: now }
  const assistantMsg: ChatMessage = {
    id: newId(),
    role: "assistant",
    content: reply,
    createdAt: new Date().toISOString(),
  }

  const updated = [...history, userMsg, assistantMsg]
  await saveChatHistory(auth.session.userId, auth.session.academiaId, updated, {
    lastUserMessage: message.slice(0, 500),
    lastAssistantMessage: reply.slice(0, 500),
  })

  return NextResponse.json({
    ok: true,
    reply,
    engine,
    model: model ?? null,
    messages: updated,
  })
}
