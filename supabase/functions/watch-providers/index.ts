import { authenticate, createAdminClient } from '../_shared/auth.ts'
import { corsHeaders, errorResponse, json, readJson } from '../_shared/http.ts'
import {
  configuredRegions,
  fetchWatchSources,
  findWatchmodeId,
  WatchmodeError,
  type WatchMediaType,
} from '../_shared/watchmode.ts'

/** Plano gratuito da Watchmode exige atualizar ou apagar dados em cache em até 30 dias. */
const CACHE_DAYS = 30
const CACHE_MS = CACHE_DAYS * 24 * 60 * 60 * 1000

const isMediaType = (value: unknown): value is WatchMediaType => value === 'movie' || value === 'tv'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return errorResponse(405, 'Método não permitido.')

  const auth = await authenticate(req)
  if (!auth) return errorResponse(401, 'Não autenticado.')

  const body = await readJson(req)
  const tmdbId = body?.tmdb_id
  const mediaType = body?.media_type
  if (!Number.isInteger(tmdbId) || (tmdbId as number) <= 0) return errorResponse(400, 'tmdb_id inválido.')
  if (!isMediaType(mediaType)) return errorResponse(400, 'media_type deve ser movie ou tv.')
  const id = tmdbId as number

  try {
    const admin = createAdminClient()

    const { data: lookup, error: lookupError } = await admin
      .from('media_watch_lookups')
      .select('watchmode_id, fetched_at')
      .eq('tmdb_id', id)
      .eq('media_type', mediaType)
      .maybeSingle()
    if (lookupError) throw lookupError

    const isFresh = lookup !== null && Date.now() - new Date(lookup.fetched_at).getTime() < CACHE_MS

    if (!isFresh) {
      const regions = configuredRegions()
      const watchmodeId = await findWatchmodeId(mediaType, id)
      const sources = watchmodeId ? await fetchWatchSources(watchmodeId, regions) : []
      const fetchedAt = new Date().toISOString()

      // Só grava depois de a Watchmode responder: falha na API não apaga o cache existente.
      const { error: deleteError } = await admin
        .from('media_watch_providers')
        .delete()
        .eq('tmdb_id', id)
        .eq('media_type', mediaType)
      if (deleteError) throw deleteError

      if (sources.length > 0) {
        const { error: insertError } = await admin.from('media_watch_providers').insert(
          sources.map((source) => ({ tmdb_id: id, media_type: mediaType, ...source })),
        )
        if (insertError) throw insertError
      }

      const { error: upsertError } = await admin.from('media_watch_lookups').upsert(
        { tmdb_id: id, media_type: mediaType, watchmode_id: watchmodeId, fetched_at: fetchedAt },
        { onConflict: 'tmdb_id,media_type' },
      )
      if (upsertError) throw upsertError
    }

    // Leitura com o cliente do usuário: a RLS continua valendo.
    const { data: rows, error: rowsError } = await auth.userClient
      .from('media_watch_providers')
      .select('region, source_id, access_type, provider_name, web_url, ios_url, android_url')
      .eq('tmdb_id', id)
      .eq('media_type', mediaType)
      .order('provider_name', { ascending: true })
    if (rowsError) throw rowsError

    return json({
      tmdb_id: id,
      media_type: mediaType,
      fetched_at: isFresh ? lookup!.fetched_at : new Date().toISOString(),
      providers: rows ?? [],
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'erro desconhecido'
    if (error instanceof WatchmodeError) {
      console.error('watch-providers: Watchmode falhou', error.status)
    } else {
      console.error('watch-providers falhou:', message)
    }
    return errorResponse(502, 'Não foi possível consultar onde assistir. Tente novamente.')
  }
})
