import { describe, expect, it } from 'vitest'
import type { ListItem } from '../../types'
import { sortListItems } from '../order'

const item = (id: string, status: ListItem['status'], is_pinned = false) =>
  ({ id, status, is_pinned }) as unknown as ListItem

describe('sortListItems', () => {
  it('ordena por status: para assistir, assistidos, arquivados', () => {
    const sorted = sortListItems([item('a', 'ARQUIVADO'), item('b', 'ASSISTIDO'), item('c', 'ASSISTIR')])
    expect(sorted.map((i) => i.id)).toEqual(['c', 'b', 'a'])
  })

  it('dentro do mesmo status, fixados vêm primeiro e o restante mantém a ordem', () => {
    const sorted = sortListItems([
      item('a', 'ASSISTIR'),
      item('b', 'ASSISTIR', true),
      item('c', 'ASSISTIR'),
      item('d', 'ASSISTIR', true),
    ])
    expect(sorted.map((i) => i.id)).toEqual(['b', 'd', 'a', 'c'])
  })

  it('fixado não sobe acima de um status anterior', () => {
    const sorted = sortListItems([item('a', 'ASSISTIDO', true), item('b', 'ASSISTIR')])
    expect(sorted.map((i) => i.id)).toEqual(['b', 'a'])
  })

  it('não altera o array original', () => {
    const input = [item('a', 'ARQUIVADO'), item('b', 'ASSISTIR')]
    sortListItems(input)
    expect(input.map((i) => i.id)).toEqual(['a', 'b'])
  })
})
