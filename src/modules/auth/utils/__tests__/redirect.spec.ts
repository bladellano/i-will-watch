import { describe, expect, it } from 'vitest'
import { safeRedirect } from '../redirect'

describe('safeRedirect', () => {
  it('mantém caminhos internos', () => {
    expect(safeRedirect('/capturar')).toBe('/capturar')
    expect(safeRedirect('/listas/123?x=1')).toBe('/listas/123?x=1')
  })

  it.each([undefined, '', 'https://evil.com', '//evil.com', '/\\evil.com', ['/x']])(
    'cai na home para valor inválido: %s',
    (value) => {
      expect(safeRedirect(value)).toBe('/')
    },
  )
})
