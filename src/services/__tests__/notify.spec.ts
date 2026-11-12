import { describe, expect, it } from 'vitest'
import { buildLikeNotification, buildNotification, parseLikeEvent, parseNewUserEvent, safeEqual } from '../../../supabase/functions/_shared/notify'

describe('notify (novo usuário)', () => {
  it('rejeita corpo inválido ou sem e-mail', () => {
    for (const body of [null, 'x', {}, { email: '' }, { email: 5 }]) expect(parseNewUserEvent(body)).toBeNull()
  })

  it('aceita nome ausente e limpa quebras de linha', () => {
    const event = parseNewUserEvent({ email: 'a@b.com\r\nBcc: x@y.com', name: null })
    expect(event?.email).not.toMatch(/[\r\n]/)
    expect(event?.name).toBeNull()
  })

  it('o assunto não aceita quebras de linha (injeção de cabeçalho)', () => {
    const event = parseNewUserEvent({ email: 'a@b.com', name: 'Ana\nBcc: x@y.com' })!
    expect(buildNotification(event).subject).not.toMatch(/[\r\n]/)
  })

  it('escapa HTML no corpo', () => {
    const event = parseNewUserEvent({ email: 'a@b.com', name: '<script>alert(1)</script>' })!
    const { html } = buildNotification(event)
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('inclui nome e e-mail', () => {
    const msg = buildNotification(parseNewUserEvent({ email: 'ana@ex.com', name: 'Ana' })!)
    expect(msg.subject).toBe('Novo usuário: Ana <ana@ex.com>')
    expect(msg.text).toContain('Nome: Ana')
    expect(msg.text).toContain('E-mail: ana@ex.com')
  })

  it('safeEqual compara segredos', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abd')).toBe(false)
    expect(safeEqual('abc', 'abcd')).toBe(false)
  })
})

describe('notify (curtida)', () => {
  const owner = '3f2b8c1e-9d4a-4e6b-8a1c-5d7e9f0a1b2c'
  it('rejeita dono inválido ou título vazio', () => {
    for (const body of [null, {}, { owner_id: 'x', title: 'A' }, { owner_id: owner, title: ' ' }]) {
      expect(parseLikeEvent(body)).toBeNull()
    }
  })
  it('usa nome padrão, limpa quebras de linha e escapa HTML', () => {
    const event = parseLikeEvent({ owner_id: owner, liker_name: '', title: 'A\nBcc: x@y.com <b>' })!
    expect(event.liker_name).toBe('Um membro')
    const msg = buildLikeNotification(event)
    expect(msg.subject).not.toMatch(/[\r\n]/)
    expect(msg.html).not.toContain('<b>')
  })
})
