import type { MediaType } from '@/modules/media/types'

/** Abas da timeline. "Atividades" (adicionou à lista, começou/terminou) entra na fase 2. */
export type TimelineFilter = 'all' | 'comment' | 'like'

export type TimelineEventType = 'comment' | 'like'

/** Item da timeline devolvido por `community_timeline`: só primeiro nome e dados públicos do catálogo. */
export interface TimelineEvent {
  event_type: TimelineEventType
  /** Chave estável do item e do cursor: id do comentário ou `item:curtidor`. */
  event_id: string
  occurred_at: string
  /** Primeiro nome do autor ("Você" para o próprio usuário). */
  actor_name: string
  is_own: boolean
  media_id: string
  tmdb_id: number
  media_type: MediaType
  title: string
  release_date: string | null
  poster_path: string | null
  /** Comentário = Observações publicadas da obra do membro. */
  comment_body: string | null
  comment_edited_at: string | null
  /** Id do vínculo obra-lista: do comentário (para editar ou tirar da timeline) ou da adição curtida (para desfazer a curtida). */
  item_id: string | null
  /** Curtida: primeiro nome do dono da adição ("Você" quando é o usuário). */
  owner_name: string | null
}
