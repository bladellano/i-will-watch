import { corsHeaders, errorResponse, json, readJson } from '../_shared/http.ts'
import { sendMail, smtpConfigured } from '../_shared/mail.ts'
import { buildNotification, parseNewUserEvent, safeEqual } from '../_shared/notify.ts'

/**
 * Envia ao administrador um e-mail quando um novo usuário conclui o cadastro.
 * Chamada pelo gatilho do banco (pg_net) com o cabeçalho x-webhook-secret.
 * O SMTP do Auth do Supabase não é acessível por aqui: usamos a mesma conta SMTP via secrets.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return errorResponse(405, 'Método não permitido.')

  const expected = Deno.env.get('NOTIFY_WEBHOOK_SECRET') ?? ''
  const received = req.headers.get('x-webhook-secret') ?? ''
  if (!expected || !safeEqual(received, expected)) return errorResponse(401, 'Não autorizado.')

  const event = parseNewUserEvent(await readJson(req))
  if (!event) return errorResponse(400, 'Dados inválidos.')

  const to = Deno.env.get('ADMIN_NOTIFY_EMAIL')
  if (!smtpConfigured() || !to) {
    console.error('notify-new-user: secrets SMTP_HOST/SMTP_USER/SMTP_PASS/ADMIN_NOTIFY_EMAIL ausentes')
    return errorResponse(500, 'Notificação não configurada.')
  }

  try {
    await sendMail({ to, ...buildNotification(event) })
    return json({ ok: true })
  } catch (error) {
    // Sem detalhes na resposta (e sem credenciais nos logs).
    console.error('notify-new-user falhou:', error instanceof Error ? error.message : 'erro desconhecido')
    return errorResponse(502, 'Não foi possível enviar a notificação.')
  }
})
