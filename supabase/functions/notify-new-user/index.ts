import nodemailer from 'npm:nodemailer@6'
import { corsHeaders, errorResponse, json, readJson } from '../_shared/http.ts'
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

  const host = Deno.env.get('SMTP_HOST')
  const user = Deno.env.get('SMTP_USER')
  const pass = Deno.env.get('SMTP_PASS')
  const to = Deno.env.get('ADMIN_NOTIFY_EMAIL')
  if (!host || !user || !pass || !to) {
    console.error('notify-new-user: secrets SMTP_HOST/SMTP_USER/SMTP_PASS/ADMIN_NOTIFY_EMAIL ausentes')
    return errorResponse(500, 'Notificação não configurada.')
  }
  const port = Number(Deno.env.get('SMTP_PORT') ?? '465')
  const from = Deno.env.get('SMTP_FROM') ?? user

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 10_000,
      socketTimeout: 15_000,
    })
    const message = buildNotification(event)
    await transporter.sendMail({ from, to, subject: message.subject, text: message.text, html: message.html })
    return json({ ok: true })
  } catch (error) {
    // Sem detalhes na resposta (e sem credenciais nos logs).
    console.error('notify-new-user falhou:', error instanceof Error ? error.message : 'erro desconhecido')
    return errorResponse(502, 'Não foi possível enviar a notificação.')
  }
})
