import { describe, expect, it } from 'vitest'
import { avatarClass, avatarInitial } from '../avatar'
import { COMMENT_MAX_LENGTH, isValidComment } from '../comment'

describe('isValidComment', () => {
  it('exige de 1 a 1.000 caracteres depois de aparar', () => {
    expect(isValidComment('')).toBe(false)
    expect(isValidComment('   \n ')).toBe(false)
    expect(isValidComment('Comecei ontem')).toBe(true)
    expect(isValidComment('a'.repeat(COMMENT_MAX_LENGTH))).toBe(true)
    expect(isValidComment('a'.repeat(COMMENT_MAX_LENGTH + 1))).toBe(false)
    expect(isValidComment(`  ${'a'.repeat(COMMENT_MAX_LENGTH)}  `)).toBe(true)
  })
})

describe('avatar', () => {
  it('usa a inicial maiúscula do nome', () => {
    expect(avatarInitial('ana')).toBe('A')
    expect(avatarInitial('Você')).toBe('V')
    expect(avatarInitial('  ')).toBe('?')
  })

  it('a cor é estável para o mesmo nome', () => {
    expect(avatarClass('Rafael')).toBe(avatarClass('Rafael'))
    expect(avatarClass('Rafael')).toMatch(/^bg-/)
  })
})
