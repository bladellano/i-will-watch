import { createAdminClient } from '../_shared/auth.ts'
import { type AuthUserLike, MAX_RECIPIENTS_PER_RUN, parseSendRequest, selectRecipients } from '../_shared/email-audience.ts'
import { buildEmail, type EmailType, type Recipient, TYPES_WITH_RECENT_ITEMS } from '../_shared/email-templates.ts'
import { corsHeaders, errorResponse, json, readJson } from '../_shared/http.ts'
import { sendMail, smtpConfigured } from '../_shared/mail.ts'
import { fetchRecentItems } from '../_shared/member-items.ts'
import { safeEqual } from '../_shared/notify.ts'

/**
 * Envia e-mails aos membros (lembretes e, no futuro, outros tipos).
 * Chamada pelo administrador (comando `npm run email`) com o cabeçalho x-admin-secret.
 * Por padrão NÃO envia: é preciso "dry_run": false no corpo; sem isso, só conta os destinatários.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return errorResponse(405, 'Método não permitido.')

  const expected = Deno.env.get('MAIL_ADMIN_SECRET') ?? ''
  const received = req.headers.get('x-admin-secret') ?? ''
  if (!expected || !safeEqual(received, expected)) return errorResponse(401, 'Não autorizado.')

  const parsed = parseSendRequest(await readJson(req))
  if (!parsed.ok) return errorResponse(400, parsed.error)
  const { type, to, dryRun } = parsed.request

  if (!dryRun && !smtpConfigured()) return errorResponse(500, 'Envio de e-mails não configurado.')

  let users: AuthUserLike[]
  try {
    users = await listAllUsers()
  } catch (error) {
    console.error('send-member-email: listagem de membros falhou:', reason(error))
    // Admin autenticado pelo segredo: o motivo ajuda a diagnosticar. Nunca contém e-mails.
    return json({ error: 'Não foi possível consultar os membros.', detail: reason(error) }, 500)
  }

  let recipients: Recipient[]
  try {
    recipients = await withRecipientData(type, selectRecipients(users, to))
  } catch (error) {
    console.error('send-member-email: consulta de itens falhou:', reason(error))
    return json({ error: 'Não foi possível consultar os itens dos membros.', detail: reason(error) }, 500)
  }
  if (recipients.length === 0) {
    return errorResponse(404, 'Nenhum destinatário elegível para este e-mail (membro confirmado, com itens se o tipo exigir).')
  }
  if (recipients.length > MAX_RECIPIENTS_PER_RUN) {
    return errorResponse(422, `Limite de ${MAX_RECIPIENTS_PER_RUN} destinatários por envio.`)
  }

  // Os e-mails dos membros nunca voltam na resposta: só contagens.
  const summary = { ok: true, type, dry_run: dryRun, recipients: recipients.length, sent: 0, failed: 0 }
  if (dryRun) return json(summary)

  const appUrl = Deno.env.get('APP_URL') ?? null
  for (const recipient of recipients) {
    try {
      await sendMail({ to: recipient.email, ...buildEmail(type, recipient, { appUrl }) })
      summary.sent++
    } catch (error) {
      summary.failed++
      console.error('send-member-email: envio falhou:', reason(error))
    }
  }
  return json(summary)
})

/** Anexa os dados que cada tipo precisa; membros sem dados necessários ficam de fora. */
async function withRecipientData(type: EmailType, recipients: Recipient[]): Promise<Recipient[]> {
  if (!TYPES_WITH_RECENT_ITEMS.includes(type)) return recipients
  const admin = createAdminClient()
  const ready: Recipient[] = []
  for (const recipient of recipients) {
    if (!recipient.id) continue
    const recentItems = await fetchRecentItems(admin, recipient.id)
    if (recentItems.length > 0) ready.push({ ...recipient, recentItems })
  }
  return ready
}

/** Percorre todas as páginas de usuários do Auth (service role). */
async function listAllUsers(): Promise<AuthUserLike[]> {
  const admin = createAdminClient()
  const perPage = 1000
  const users: AuthUserLike[] = []
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    users.push(...data.users)
    if (data.users.length < perPage) break
  }
  return users
}

const reason = (error: unknown) => (error instanceof Error ? error.message : 'erro desconhecido')
