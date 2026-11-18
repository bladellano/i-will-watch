import { invokeFunction } from '@/services/supabase/functions'
import type { MediaType } from '../types'

/** Uma fonte de streaming de uma obra em um país, como guardada pela função watch-providers. */
export interface WatchProvider {
  region: string
  source_id: number
  access_type: string
  provider_name: string
  web_url: string | null
  ios_url: string | null
  android_url: string | null
}

export interface WatchProvidersResponse {
  tmdb_id: number
  media_type: MediaType
  fetched_at: string
  providers: WatchProvider[]
}

/** Onde assistir uma obra, em todos os países configurados. A função usa cache de até 30 dias. */
export async function fetchWatchProviders(tmdbId: number, mediaType: MediaType): Promise<WatchProvidersResponse> {
  return invokeFunction<WatchProvidersResponse>(
    'watch-providers',
    { tmdb_id: tmdbId, media_type: mediaType },
    'Não foi possível consultar onde assistir.',
  )
}
