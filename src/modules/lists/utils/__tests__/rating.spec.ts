import { describe, expect, it } from 'vitest'
import { parseRating } from '../rating'

describe('parseRating', () => {
  it('aceita texto e número (v-model type=number devolve número)', () => {
    expect(parseRating('9')).toEqual({ ok: true, value: 9 })
    expect(parseRating(9)).toEqual({ ok: true, value: 9 })
  })
  it('vazio, nulo ou espaços significam sem nota', () => {
    for (const v of ['', '  ', null, undefined]) expect(parseRating(v)).toEqual({ ok: true, value: null })
  })
  it('rejeita fora de 1 a 10 e não inteiros', () => {
    for (const v of ['0', 11, '5.5', 'abc', -1]) expect(parseRating(v)).toEqual({ ok: false })
  })
})
