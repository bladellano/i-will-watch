export type MediaType = 'movie' | 'tv'

export type WatchStatus = 'ASSISTIR' | 'ARQUIVADO' | 'ASSISTIDO'

export const WATCH_STATUS_LABELS: Record<WatchStatus, string> = {
  ASSISTIR: 'Assistir',
  ARQUIVADO: 'Arquivado',
  ASSISTIDO: 'Assistido',
}

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  movie: 'Filme',
  tv: 'Série',
}

export interface TmdbSearchResult {
  tmdb_id: number
  media_type: MediaType
  title: string
  original_title: string | null
  release_date: string | null
  overview: string | null
  poster_path: string | null
  backdrop_path: string | null
  tmdb_rating: number | null
}

export interface TmdbSearchResponse {
  page: number
  total_pages: number
  results: TmdbSearchResult[]
}

export interface AddMediaResponse {
  media_id: string
  already_in_list: boolean
}
