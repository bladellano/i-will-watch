import type { WatchStatus } from '@/modules/media/types'
import type { ListItem } from '../types'

/** Sequência fixa das seções da lista. */
export const STATUS_ORDER: readonly WatchStatus[] = ['ASSISTIR', 'ASSISTIDO', 'ARQUIVADO']

/**
 * Ordena por status (para assistir, assistidos, arquivados). Dentro de cada status,
 * os itens fixados aparecem primeiro; o restante mantém a ordem recebida.
 * Não altera o array original.
 */
export function sortListItems(items: readonly ListItem[]): ListItem[] {
  const rank = (status: WatchStatus) => STATUS_ORDER.indexOf(status)
  return [...items].sort((a, b) => {
    const byStatus = rank(a.status) - rank(b.status)
    if (byStatus !== 0) return byStatus
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
    return 0
  })
}
