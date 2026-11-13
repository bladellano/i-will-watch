import { describe, expect, it } from 'vitest'
import { formatRelativeTime } from '../relative-time'

const now = new Date('2026-11-13T12:00:00Z')
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString()
const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

describe('formatRelativeTime', () => {
  it('menos de 1 minuto (inclusive relógio adiantado) vira "há instantes"', () => {
    expect(formatRelativeTime(ago(20_000), now)).toBe('há instantes')
    expect(formatRelativeTime(ago(-5_000), now)).toBe('há instantes')
  })

  it('minutos, horas e dias, com singular e plural', () => {
    expect(formatRelativeTime(ago(MIN), now)).toBe('há 1 minuto')
    expect(formatRelativeTime(ago(12 * MIN), now)).toBe('há 12 minutos')
    expect(formatRelativeTime(ago(HOUR), now)).toBe('há 1 hora')
    expect(formatRelativeTime(ago(5 * HOUR), now)).toBe('há 5 horas')
    expect(formatRelativeTime(ago(DAY), now)).toBe('há 1 dia')
    expect(formatRelativeTime(ago(6 * DAY + 23 * HOUR), now)).toBe('há 6 dias')
  })

  it('a partir de 7 dias mostra a data absoluta', () => {
    expect(formatRelativeTime('2026-11-06T12:00:00Z', now)).toBe('06/11/2026')
    expect(formatRelativeTime('2026-01-05T15:30:00Z', now)).toBe('05/01/2026')
  })

  it('data inválida devolve vazio', () => {
    expect(formatRelativeTime('não é data', now)).toBe('')
  })
})
