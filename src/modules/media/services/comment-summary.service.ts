import { invokeFunction } from '@/services/supabase/functions'
import type { MediaType } from '../types'

export type CommentSummaryResponse =
  | { status: 'insufficient'; comment_count: number }
  | {
      status: 'ready'
      summary: string
      highlights: string[]
      comment_count: number
      generated_at: string
    }

/** Resumo por IA dos comentários públicos da obra (igual para todos os membros; fica em cache no servidor). */
export async function fetchCommentSummary(tmdbId: number, mediaType: MediaType): Promise<CommentSummaryResponse> {
  return invokeFunction<CommentSummaryResponse>(
    'summarize-comments',
    { tmdb_id: tmdbId, media_type: mediaType },
    'Não foi possível carregar o resumo dos comentários.',
  )
}
