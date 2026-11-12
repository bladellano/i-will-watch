import { createAdminClient } from '../_shared/auth.ts'
import { corsHeaders, errorResponse, json, readJson } from '../_shared/http.ts'
import { sendMail, smtpConfigured } from '../_shared/mail.ts'
import { buildLikeNotification, parseLikeEvent, safeEqual } from '../_shared/notify.ts'

/**
 * Avisa por e-mail o dono da obra quando outro membro a curte.
 * Chamada pelo gatilho do banco (pg_net) com o cabeçalho x-webhook-secret.
 * Desligada por padrão: só é acionada quando os segredos do Vault existem (docs/publicacao.md, 3.3).
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return errorResponse(405, 'Método não permitido.')

  const expected = Deno.env.get('NOTIFY_WEBHOOK_SECRET') ?? ''
  const received = req.headers.get('x-webhook-secret') ?? ''
  if (!expected || !safeEqual(received, expected)) return errorResponse(401, 'Não autorizado.')

  const event = parseLikeEvent(await readJson(req))
  if (!event) return errorResponse(400, 'Dados inválidos.')
  if (!smtpConfigured()) {
    console.error('notify-like: secrets SMTP_HOST/SMTP_USER/SMTP_PASS ausentes')
    return errorResponse(500, 'Notificação não configurada.')
  }

  try {
    // O e-mail do dono nunca viaja pelo banco/trigger: é buscado aqui, com service role.
    const { data, error } = await createAdminClient().auth.admin.getUserById(event.owner_id)
    const to = data?.user?.email
    if (error || !to) return errorResponse(404, 'Destinatário não encontrado.')
    await sendMail({ to, ...buildLikeNotification(event) })
    return json({ ok: true })
  } catch (error) {
    console.error('notify-like falhou:', error instanceof Error ? error.message : 'erro desconhecido')
    return errorResponse(502, 'Não foi possível enviar a notificação.')
  }
})
