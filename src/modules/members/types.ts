import type { MediaType } from '@/modules/media/types'

/** Membro cujas listas estão sendo exibidas. */
export interface MemberRef {
  id: string
  name: string
}

export interface MemberList {
  id: string
  name: string
  description: string | null
  is_default: boolean
  item_count: number
}

/** Obra de uma lista de outro membro: só dados de exibição, sem notas nem avaliação pessoal. */
export interface MemberListItem {
  id: string
  title: string
  media_type: MediaType
  release_date: string | null
  poster_path: string | null
}
