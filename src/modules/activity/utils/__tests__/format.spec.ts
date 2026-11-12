import { describe, expect, it } from 'vitest'
import { formatAddedAt } from '../format'

describe('formatAddedAt', () => {
  it('formata dia por extenso e hora com h', () => {
    expect(formatAddedAt('2026-06-11T11:34:00')).toBe('11 de junho às 11h34')
    expect(formatAddedAt('2026-01-05T09:05:00')).toBe('5 de janeiro às 09h05')
  })
  it('devolve vazio para data inválida', () => {
    expect(formatAddedAt('lixo')).toBe('')
  })
})
