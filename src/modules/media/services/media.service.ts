import { requestError } from '@/services/network'
import { supabase } from '@/services/supabase/client'
import { invokeFunction } from '@/services/supabase/functions'
import type { AddMediaResponse, MediaType, TmdbSearchResponse, WatchStatus } from '../types'

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p'

export function posterUrl(path: string | null, size: 'w185' | 'w342' = 'w342'): string | null {
  return path ? `${TMDB_IMAGE_BASE_URL}/${size}${path}` : null
}

export function releaseYear(date: string | null): string {
  return date && date.length >= 4 ? date.slice(0, 4) : 's/ data'
}

export async function searchTmdb(query: string, page = 1): Promise<TmdbSearchResponse> {
  return invokeFunction<TmdbSearchResponse>(
    'search-tmdb',
    { query, page },
    'Não foi possível buscar no catálogo. Tente novamente.',
  )
}

export interface AddMediaInput {
  tmdbId: number
  mediaType: MediaType
  listId: string
  status: WatchStatus
  /** Quando a obra vem de uma captura, conclui a captura junto. */
  captureId?: string
}

export async function addMedia(input: AddMediaInput): Promise<AddMediaResponse> {
  return invokeFunction<AddMediaResponse>(
    'add-media',
    {
      tmdb_id: input.tmdbId,
      media_type: input.mediaType,
      list_id: input.listId,
      status: input.status,
      ...(input.captureId ? { capture_id: input.captureId } : {}),
    },
    'Não foi possível adicionar a obra. Tente novamente.',
  )
}

/** Dados de uma obra do catálogo para o modal de detalhes (o catálogo é legível por qualquer membro logado). */
export interface MediaDetails {
  tmdb_id: number
  media_type: MediaType
  title: string
  original_title: string | null
  release_date: string | null
  overview: string | null
  poster_path: string | null
  tmdb_rating: number | null
  genres: string[] | null
}

export async function fetchMediaDetails(mediaId: string): Promise<MediaDetails> {
  const { data, error } = await supabase
    .from('media')
    .select('tmdb_id, media_type, title, original_title, release_date, overview, poster_path, tmdb_rating, genres')
    .eq('id', mediaId)
    .maybeSingle()
  if (error || !data) throw requestError('Não foi possível carregar os detalhes da obra.')
  return data as MediaDetails
}
