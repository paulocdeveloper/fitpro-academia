"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Mail, Phone, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type Step = "identifier" | "code" | "password" | "success"
type Channel = "email" | "sms"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const STEPS: Step[] = ["identifier", "code", "password", "success"]

function stepIndex(step: Step): number {
  return STEPS.indexOf(step)
}

export function ForgotPasswordDialog({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<Step>("identifier")
  const [channel, setChannel] = useState<Channel>("email")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [showPass2, setShowPass2] = useState(false)
  const [resetToken, setResetToken] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [devHint, setDevHint] = useState<string | null>(null)
  const codeInputRef = useRef<HTMLInputElement>(null)

  const resetState = useCallback(() => {
    setStep("identifier")
    setChannel("email")
    setEmail("")
    setPhone("")
    setCode("")
    setPassword("")
    setPasswordConfirm("")
    setResetToken("")
    setMessage(null)
    setError(null)
    setDevHint(null)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!open) {
      resetState()
    }
  }, [open, resetState])

  useEffect(() => {
    if (step === "code" && codeInputRef.current) {
      codeInputRef.current.focus()
    }
  }, [step])

  const handleClose = (next: boolean) => {
    if (!next) resetState()
    onOpenChange(next)
  }

  const handleRequestCode = async () => {
    setError(null)
    setMessage(null)
    setDevHint(null)
    setLoading(true)
    try {
      const body =
        channel === "email"
          ? { channel: "email", email: email.trim() }
          : { channel: "sms", phone: phone.trim() }

      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        message?: string
        resetToken?: string
        devHint?: string
      }

      if (!res.ok) {
        setError(data.error ?? "Não foi possível enviar o código.")
        return
      }

      setResetToken(data.resetToken ?? "")
      setMessage(data.message ?? "Código enviado!")
      if (data.devHint) setDevHint(data.devHint)
      setStep("code")
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/auth/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, code: code.replace(/\D/g, "") }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string }

      if (!res.ok) {
        setError(data.error ?? "Código inválido.")
        return
      }

      setMessage(data.message ?? "Código confirmado.")
      setStep("password")
    } catch {
      setError("Erro de conexão.")
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    setError(null)
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.")
      return
    }
    if (password !== passwordConfirm) {
      setError("As senhas não coincidem.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resetToken,
          code: code.replace(/\D/g, ""),
          password,
          passwordConfirm,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string }

      if (!res.ok) {
        setError(data.error ?? "Não foi possível alterar a senha.")
        if (res.status === 410) setStep("identifier")
        return
      }

      setMessage(data.message ?? "Senha alterada com sucesso!")
      setStep("success")
    } catch {
      setError("Erro de conexão.")
    } finally {
      setLoading(false)
    }
  }

  const currentStep = stepIndex(step)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md bg-card border-border p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 space-y-1 text-left">
          <DialogTitle
            className="text-lg font-bold flex items-center gap-2"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            <KeyRound className="w-5 h-5 neon-text shrink-0" />
            Recuperar senha
          </DialogTitle>
          <DialogDescription className="text-sm">
            {step === "identifier" && "Informe e-mail ou telefone cadastrado."}
            {step === "code" && "Digite o código de 6 dígitos recebido."}
            {step === "password" && "Crie uma nova senha segura."}
            {step === "success" && "Pronto! Você já pode entrar."}
          </DialogDescription>
        </DialogHeader>

        {/* Progresso */}
        {step !== "success" && (
          <div className="px-5 pb-2 flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  i <= currentStep ? "bg-primary" : "bg-secondary",
                )}
              />
            ))}
          </div>
        )}

        <div className="px-5 pb-5 space-y-4">
          {message && step !== "identifier" && (
            <p className="text-sm text-primary bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
              {message}
            </p>
          )}

          {devHint && (
            <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              Dev: código <strong className="tracking-widest">{devHint}</strong>
            </p>
          )}

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Passo 1 — identificador */}
          {step === "identifier" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-secondary">
                <button
                  type="button"
                  onClick={() => setChannel("email")}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                    channel === "email"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  <Mail className="w-4 h-4" />
                  E-mail
                </button>
                <button
                  type="button"
                  onClick={() => setChannel("sms")}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                    channel === "sms"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  <Phone className="w-4 h-4" />
                  Telefone
                </button>
              </div>

              {channel === "email" ? (
                <div className="space-y-2">
                  <Label htmlFor="fp-email">E-mail cadastrado</Label>
                  <Input
                    id="fp-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 bg-secondary border-border/50"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="fp-phone">Telefone cadastrado</Label>
                  <Input
                    id="fp-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-11 bg-secondary border-border/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use o telefone vinculado ao seu cadastro de aluno.
                  </p>
                </div>
              )}

              <Button
                type="button"
                className="w-full h-11 font-semibold"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                disabled={
                  loading ||
                  (channel === "email" ? !email.trim() : phone.replace(/\D/g, "").length < 10)
                }
                onClick={() => void handleRequestCode()}
              >
                {loading ? "Enviando…" : "Enviar código"}
              </Button>
            </div>
          )}

          {/* Passo 2 — código */}
          {step === "code" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fp-code">Código de 6 dígitos</Label>
                <Input
                  ref={codeInputRef}
                  id="fp-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-14 text-center text-2xl tracking-[0.5em] font-bold bg-secondary border-border/50"
                />
              </div>

              <Button
                type="button"
                className="w-full h-11 font-semibold"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                disabled={loading || code.length !== 6}
                onClick={() => void handleVerifyCode()}
              >
                {loading ? "Verificando…" : "Confirmar código"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground gap-2"
                onClick={() => {
                  setStep("identifier")
                  setCode("")
                  setError(null)
                }}
              >
                <ArrowLeft className="w-4 h-4" />
                Reenviar código
              </Button>
            </div>
          )}

          {/* Passo 3 — nova senha */}
          {step === "password" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fp-pass">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="fp-pass"
                    type={showPass ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10 bg-secondary border-border/50"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fp-pass2">Confirmar nova senha</Label>
                <div className="relative">
                  <Input
                    id="fp-pass2"
                    type={showPass2 ? "text" : "password"}
                    autoComplete="new-password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className="h-11 pr-10 bg-secondary border-border/50"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass2(!showPass2)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPass2 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="button"
                className="w-full h-11 font-semibold gap-2"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                disabled={loading || password.length < 6}
                onClick={() => void handleResetPassword()}
              >
                <ShieldCheck className="w-4 h-4" />
                {loading ? "Salvando…" : "Alterar senha"}
              </Button>
            </div>
          )}

          {/* Passo 4 — sucesso */}
          {step === "success" && (
            <div className="space-y-4 text-center py-2">
              <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center bg-primary/15">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">{message}</p>
              <Button
                type="button"
                className="w-full h-11 font-semibold"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                onClick={() => handleClose(false)}
              >
                Voltar ao login
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
