import nodemailer from 'npm:nodemailer@6'

export interface MailMessage {
  to: string
  subject: string
  text: string
  html: string
}

/** Indica se os secrets de SMTP existem (sem lançar erro). */
export function smtpConfigured(): boolean {
  return Boolean(Deno.env.get('SMTP_HOST') && Deno.env.get('SMTP_USER') && Deno.env.get('SMTP_PASS'))
}

/** Envia um e-mail pela conta SMTP definida nos secrets (SMTP_HOST/PORT/USER/PASS/SMTP_FROM). */
export async function sendMail(message: MailMessage): Promise<void> {
  const host = Deno.env.get('SMTP_HOST')
  const user = Deno.env.get('SMTP_USER')
  const pass = Deno.env.get('SMTP_PASS')
  if (!host || !user || !pass) throw new Error('SMTP não configurado.')
  const port = Number(Deno.env.get('SMTP_PORT') ?? '465')
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 10_000,
    socketTimeout: 15_000,
  })
  await transporter.sendMail({ from: Deno.env.get('SMTP_FROM') ?? user, ...message })
}
