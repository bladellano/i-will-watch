import { supabase } from '@/services/supabase/client'
import type { AddMediaResponse, MediaType, TmdbSearchResponse, WatchStatus } from '../types'

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p'

export function posterUrl(path: string | null, size: 'w185' | 'w342' = 'w342'): string | null {
  return path ? `${TMDB_IMAGE_BASE_URL}/${size}${path}` : null
}

export function releaseYear(date: string | null): string {
  return date && date.length >= 4 ? date.slice(0, 4) : 's/ data'
}

export async function searchTmdb(query: string, page = 1): Promise<TmdbSearchResponse> {
  const { data, error } = await supabase.functions.invoke<TmdbSearchResponse>('search-tmdb', {
    body: { query, page },
  })
  if (error || !data) throw new Error('Não foi possível buscar no catálogo. Tente novamente.')
  return data
}

export interface AddMediaInput {
  tmdbId: number
  mediaType: MediaType
  listId: string
  status: WatchStatus
}

export async function addMedia(input: AddMediaInput): Promise<AddMediaResponse> {
  const { data, error } = await supabase.functions.invoke<AddMediaResponse>('add-media', {
    body: {
      tmdb_id: input.tmdbId,
      media_type: input.mediaType,
      list_id: input.listId,
      status: input.status,
    },
  })
  if (error || !data) throw new Error('Não foi possível adicionar a obra. Tente novamente.')
  return data
}
