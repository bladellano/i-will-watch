import type { MediaType, WatchStatus } from '@/modules/media/types'

export interface UserList {
  id: string
  name: string
  is_default: boolean
}

export interface ListSummary extends UserList {
  description: string | null
  item_count: number
}

export interface ListDetails extends UserList {
  description: string | null
}

export interface ListItemMedia {
  id: string
  tmdb_id: number
  media_type: MediaType
  title: string
  original_title: string | null
  release_date: string | null
  overview: string | null
  poster_path: string | null
  backdrop_path: string | null
  tmdb_rating: number | null
  genres: string[]
}

/** Vínculo obra-lista (`list_media`) com os dados de catálogo (`media`). */
export interface ListItem {
  id: string
  status: WatchStatus
  personal_rating: number | null
  notes: string | null
  added_at: string
  watched_at: string | null
  media: ListItemMedia
}

export interface ListItemPatch {
  status: WatchStatus
  personal_rating: number | null
  notes: string | null
  watched_at: string | null
}
