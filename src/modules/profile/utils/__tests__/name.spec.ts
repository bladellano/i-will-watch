import { describe, expect, it } from 'vitest'
import { displayName, isValidName, normalizeName } from '../name'

describe('name', () => {
  it('normaliza espaços e devolve null para vazio', () => {
    expect(normalizeName('  Ana   Maria ')).toBe('Ana Maria')
    expect(normalizeName('   ')).toBeNull()
    expect(normalizeName(null)).toBeNull()
  })
  it('valida de 1 a 80 caracteres', () => {
    expect(isValidName('Ana')).toBe(true)
    expect(isValidName('')).toBe(false)
    expect(isValidName('a'.repeat(81))).toBe(false)
    expect(isValidName('a'.repeat(80))).toBe(true)
  })
  it('exibe o e-mail quando não há nome', () => {
    expect(displayName('Ana', 'a@b.com')).toBe('Ana')
    expect(displayName(null, 'a@b.com')).toBe('a@b.com')
    expect(displayName('  ', 'a@b.com')).toBe('a@b.com')
  })
})
