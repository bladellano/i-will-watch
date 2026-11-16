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

  it('fixado sobe acima de itens de status anterior', () => {
    const sorted = sortListItems([item('a', 'ASSISTIR'), item('b', 'ASSISTIDO', true)])
    expect(sorted.map((i) => i.id)).toEqual(['b', 'a'])
  })

  it('fixado em assistindo fica no topo, acima de para assistir', () => {
    const sorted = sortListItems([item('a', 'ASSISTIR'), item('b', 'ASSISTINDO', true), item('c', 'ASSISTIR')])
    expect(sorted.map((i) => i.id)).toEqual(['b', 'a', 'c'])
  })

  it('assistindo fica entre para assistir e assistidos', () => {
    const sorted = sortListItems([item('a', 'ASSISTIDO'), item('b', 'ASSISTINDO'), item('c', 'ASSISTIR')])
    expect(sorted.map((i) => i.id)).toEqual(['c', 'b', 'a'])
  })

  it('não altera o array original', () => {
    const input = [item('a', 'ARQUIVADO'), item('b', 'ASSISTIR')]
    sortListItems(input)
    expect(input.map((i) => i.id)).toEqual(['a', 'b'])
  })
})
