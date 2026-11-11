import { describe, expect, it } from 'vitest'
import { dateInputToIso, isoToDateInput, todayDateInput } from '../dates'

describe('dates', () => {
  it('converte ISO em AAAA-MM-DD e devolve vazio para null ou inválido', () => {
    expect(isoToDateInput(null)).toBe('')
    expect(isoToDateInput('não é data')).toBe('')
    expect(isoToDateInput('2026-03-05T12:00:00')).toBe('2026-03-05')
  })

  it('converte AAAA-MM-DD em ISO ao meio-dia local, sem virar o dia', () => {
    const iso = dateInputToIso('2026-03-05')
    expect(iso).not.toBeNull()
    expect(isoToDateInput(iso)).toBe('2026-03-05')
  })

  it('rejeita formatos inválidos', () => {
    expect(dateInputToIso('')).toBeNull()
    expect(dateInputToIso('05/03/2026')).toBeNull()
    expect(dateInputToIso('2026-13-45')).toBeNull()
  })

  it('todayDateInput devolve o dia atual no formato de input date', () => {
    expect(todayDateInput()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
