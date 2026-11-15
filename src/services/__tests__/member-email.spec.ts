import { describe, expect, it } from 'vitest'
import { MAX_RECIPIENTS_PER_RUN, parseSendRequest, selectRecipients } from '../../../supabase/functions/_shared/email-audience'
import { APP_GOALS, buildEmail, isEmailType } from '../../../supabase/functions/_shared/email-templates'

const NOW = Date.parse('2026-11-15T00:00:00Z')

describe('e-mails para membros: pedido de envio', () => {
  it('não envia por padrão: dry_run implícito é true', () => {
    expect(parseSendRequest({ type: 'lembrete', to: 'all' })).toEqual({
      ok: true,
      request: { type: 'lembrete', to: 'all', dryRun: true },
    })
  })

  it('só envia com "dry_run": false explícito', () => {
    const result = parseSendRequest({ type: 'lembrete', to: 'all', dry_run: false })
    expect(result).toEqual({ ok: true, request: { type: 'lembrete', to: 'all', dryRun: false } })
  })

  it('rejeita tipo desconhecido, destinatário inválido e dry_run não booleano', () => {
    expect(parseSendRequest({ type: 'spam', to: 'all' }).ok).toBe(false)
    expect(parseSendRequest({ type: 'lembrete', to: 'todos-menos-eu' }).ok).toBe(false)
    expect(parseSendRequest({ type: 'lembrete', to: 'all', dry_run: 'nao' }).ok).toBe(false)
    expect(parseSendRequest(null).ok).toBe(false)
    expect(parseSendRequest([]).ok).toBe(false)
  })

  it('reconhece apenas tipos cadastrados', () => {
    expect(isEmailType('lembrete')).toBe(true)
    expect(isEmailType('promocao')).toBe(false)
  })
})

describe('selectRecipients: quem recebe', () => {
  const users = [
    { email: 'Ana@x.com', email_confirmed_at: '2026-11-01T00:00:00Z', raw_user_meta_data: { name: ' Ana ' } },
    { email: 'pendente@x.com', email_confirmed_at: null },
    { email: 'banido@x.com', email_confirmed_at: '2026-11-01T00:00:00Z', banned_until: '2099-01-01T00:00:00Z' },
    { email: 'ban-expirado@x.com', email_confirmed_at: '2026-11-01T00:00:00Z', banned_until: '2020-01-01T00:00:00Z' },
    { email: 'ana@x.com', email_confirmed_at: '2026-11-02T00:00:00Z' },
    { email: 'invalido', email_confirmed_at: '2026-11-01T00:00:00Z' },
  ]

  it('inclui só membros confirmados, não banidos e sem duplicar', () => {
    const recipients = selectRecipients(users, 'all', NOW)
    expect(recipients).toEqual([
      { email: 'Ana@x.com', name: 'Ana' },
      { email: 'ban-expirado@x.com', name: null },
    ])
  })

  it('filtra por um e-mail específico, sem diferenciar maiúsculas', () => {
    expect(selectRecipients(users, 'ANA@x.com', NOW)).toHaveLength(1)
    expect(selectRecipients(users, 'fora@x.com', NOW)).toHaveLength(0)
  })

  it('respeita o limite por execução', () => {
    expect(MAX_RECIPIENTS_PER_RUN).toBeGreaterThan(0)
  })
})

describe('buildEmail: lembrete', () => {
  it('cita os três objetivos e escapa o nome no HTML', () => {
    const email = buildEmail('lembrete', { email: 'b@x.com', name: '<script>Bia</script>' }, { appUrl: 'https://app.exemplo.com' })
    expect(APP_GOALS).toHaveLength(3)
    for (const goal of APP_GOALS) {
      expect(email.text).toContain(goal.title)
      expect(email.html).toContain(goal.title)
    }
    expect(email.html).not.toContain('<script>')
    expect(email.html).toContain('&lt;script&gt;')
    expect(email.text).toContain('https://app.exemplo.com')
  })

  it('usa saudação genérica sem nome e omite o link sem APP_URL', () => {
    const email = buildEmail('lembrete', { email: 'b@x.com', name: null }, { appUrl: null })
    expect(email.text.startsWith('Olá!')).toBe(true)
    expect(email.text).not.toContain('Acesse:')
    expect(email.html).not.toContain('href=')
  })

  it('mantém o assunto em uma linha', () => {
    const email = buildEmail('lembrete', { email: 'b@x.com', name: 'Bia\r\nBcc: x@y.com' }, { appUrl: null })
    expect(email.subject).not.toMatch(/[\r\n]/)
    expect(email.text).not.toMatch(/Bcc: x@y\.com/)
  })
})
