import type { WatchStatus } from '@/modules/media/types'
import type { ListItem } from '../types'

/** Sequência fixa das seções da lista. */
export const STATUS_ORDER: readonly WatchStatus[] = ['ASSISTIR', 'ASSISTINDO', 'ASSISTIDO', 'ARQUIVADO']

/**
 * Itens fixados ficam no topo da lista, em qualquer status. Os demais seguem a ordem por status
 * (para assistir, assistindo, assistidos, arquivados). Dentro de cada grupo, o restante mantém a
 * ordem recebida. Não altera o array original.
 */
export function sortListItems(items: readonly ListItem[]): ListItem[] {
  const rank = (status: WatchStatus) => STATUS_ORDER.indexOf(status)
  return [...items].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
    return rank(a.status) - rank(b.status)
  })
}
