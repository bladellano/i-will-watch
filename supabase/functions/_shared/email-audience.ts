// Regras de destinatários e validação do pedido de envio. Funções puras (sem imports de runtime).
import { EMAIL_TYPES, isEmailType, type EmailType, type Recipient } from './email-templates.ts'

/** Limite de segurança por execução: evita disparos em massa acidentais e respeita o limite diário do SMTP. */
export const MAX_RECIPIENTS_PER_RUN = 200

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Formato mínimo de um usuário do Supabase Auth (service role). */
export interface AuthUserLike {
  id?: string | null
  email?: string | null
  email_confirmed_at?: string | null
  banned_until?: string | null
  raw_user_meta_data?: Record<string, unknown> | null
}

export interface SendRequest {
  type: EmailType
  /** 'all' para todos os membros elegíveis, ou um e-mail específico. */
  to: 'all' | string
  /** Padrão true: só envia com "dry_run": false explícito. */
  dryRun: boolean
}

export type ParsedRequest = { ok: true; request: SendRequest } | { ok: false; error: string }

export function parseSendRequest(body: unknown): ParsedRequest {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'Corpo inválido.' }
  const raw = body as Record<string, unknown>

  if (!isEmailType(raw.type)) return { ok: false, error: `Tipo desconhecido. Use um de: ${EMAIL_TYPES.join(', ')}.` }

  let to: string
  if (raw.to === 'all') {
    to = 'all'
  } else if (typeof raw.to === 'string' && EMAIL_RE.test(raw.to.trim())) {
    to = raw.to.trim()
  } else {
    return { ok: false, error: 'Destinatário inválido: use "all" ou um e-mail.' }
  }

  if (raw.dry_run !== undefined && typeof raw.dry_run !== 'boolean') {
    return { ok: false, error: 'dry_run deve ser verdadeiro ou falso.' }
  }

  return { ok: true, request: { type: raw.type, to, dryRun: raw.dry_run !== false } }
}

/**
 * Membros elegíveis: e-mail válido, confirmado e sem banimento vigente.
 * Com um e-mail específico, só devolve esse membro (nunca envia a endereços fora da base).
 */
export function selectRecipients(users: AuthUserLike[], to: 'all' | string, now = Date.now()): Recipient[] {
  const seen = new Set<string>()
  const recipients: Recipient[] = []
  for (const user of users) {
    const email = typeof user.email === 'string' ? user.email.trim() : ''
    if (!EMAIL_RE.test(email)) continue
    if (!user.email_confirmed_at) continue
    if (user.banned_until && Date.parse(user.banned_until) > now) continue

    const key = email.toLowerCase()
    if (to !== 'all' && key !== to.toLowerCase()) continue
    if (seen.has(key)) continue
    seen.add(key)

    const meta = user.raw_user_meta_data?.name
    recipients.push({
      id: user.id ?? null,
      email,
      name: typeof meta === 'string' && meta.trim() !== '' ? meta.trim() : null,
    })
  }
  return recipients
}
