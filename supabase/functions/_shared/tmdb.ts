const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
export const TMDB_LANGUAGE = 'pt-BR'

export type MediaType = 'movie' | 'tv'

export class TmdbError extends Error {
  constructor(public readonly status: number) {
    super(`TMDB respondeu ${status}`)
  }
}

/** Chamada autenticada com o token guardado nas secrets (nunca exposto ao navegador). */
export async function tmdbGet(path: string, params: Record<string, string | number | boolean>) {
  const token = Deno.env.get('TMDB_API_TOKEN')
  if (!token) throw new Error('TMDB_API_TOKEN não configurado.')

  const url = new URL(`${TMDB_BASE_URL}${path}`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value))

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  if (!response.ok) throw new TmdbError(response.status)
  return await response.json()
}

// deno-lint-ignore no-explicit-any
type Raw = Record<string, any>

export interface NormalizedMedia {
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

const emptyToNull = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null

/** Normaliza item de busca ou de detalhes (filme usa title/release_date; série usa name/first_air_date). */
export function normalizeMedia(raw: Raw, mediaType: MediaType): NormalizedMedia {
  const isMovie = mediaType === 'movie'
  return {
    tmdb_id: raw.id,
    media_type: mediaType,
    title: (isMovie ? raw.title : raw.name) ?? '',
    original_title: emptyToNull(isMovie ? raw.original_title : raw.original_name),
    release_date: emptyToNull(isMovie ? raw.release_date : raw.first_air_date),
    overview: emptyToNull(raw.overview),
    poster_path: emptyToNull(raw.poster_path),
    backdrop_path: emptyToNull(raw.backdrop_path),
    tmdb_rating: typeof raw.vote_average === 'number' ? raw.vote_average : null,
  }
}
