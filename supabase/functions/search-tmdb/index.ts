import { authenticate } from '../_shared/auth.ts'
import { corsHeaders, errorResponse, json, readJson } from '../_shared/http.ts'
import { normalizeMedia, TMDB_LANGUAGE, tmdbGet, type MediaType } from '../_shared/tmdb.ts'

const MAX_QUERY_LENGTH = 100
const MAX_PAGE = 50

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return errorResponse(405, 'Método não permitido.')

  const auth = await authenticate(req)
  if (!auth) return errorResponse(401, 'Não autenticado.')

  const body = await readJson(req)
  const query = typeof body?.query === 'string' ? body.query.trim() : ''
  const page = Number.isInteger(body?.page) ? (body!.page as number) : 1
  if (query.length === 0 || query.length > MAX_QUERY_LENGTH) {
    return errorResponse(400, 'Informe um título entre 1 e 100 caracteres.')
  }
  if (page < 1 || page > MAX_PAGE) return errorResponse(400, 'Página inválida.')

  try {
    const data = await tmdbGet('/search/multi', {
      query,
      page,
      language: TMDB_LANGUAGE,
      include_adult: false,
    })

    // Descarta pessoas e qualquer tipo que não seja filme ou série.
    const results = (Array.isArray(data.results) ? data.results : [])
      .filter((item: { media_type?: string }) => item.media_type === 'movie' || item.media_type === 'tv')
      .map((item: { media_type: MediaType }) => normalizeMedia(item, item.media_type))

    return json({
      page: data.page ?? page,
      total_pages: data.total_pages ?? 1,
      results,
    })
  } catch (error) {
    console.error('search-tmdb falhou:', error instanceof Error ? error.message : 'erro desconhecido')
    return errorResponse(502, 'Não foi possível consultar o catálogo. Tente novamente.')
  }
})
