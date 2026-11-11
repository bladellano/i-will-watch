import { authenticate, createAdminClient } from '../_shared/auth.ts'
import { corsHeaders, errorResponse, json, readJson } from '../_shared/http.ts'
import { normalizeMedia, TMDB_LANGUAGE, TmdbError, tmdbGet, type MediaType } from '../_shared/tmdb.ts'

const STATUSES = ['ASSISTIR', 'ARQUIVADO', 'ASSISTIDO'] as const
type Status = (typeof STATUSES)[number]
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return errorResponse(405, 'Método não permitido.')

  const auth = await authenticate(req)
  if (!auth) return errorResponse(401, 'Não autenticado.')

  // O cliente envia apenas identificadores; os dados da obra vêm do TMDB.
  const body = await readJson(req)
  const tmdbId = body?.tmdb_id
  const mediaType = body?.media_type
  const listId = body?.list_id
  const status = (body?.status ?? 'ASSISTIR') as Status

  if (!Number.isInteger(tmdbId) || (tmdbId as number) <= 0) return errorResponse(400, 'Obra inválida.')
  if (mediaType !== 'movie' && mediaType !== 'tv') return errorResponse(400, 'Tipo de obra inválido.')
  if (typeof listId !== 'string' || !UUID_RE.test(listId)) return errorResponse(400, 'Lista inválida.')
  if (!STATUSES.includes(status)) return errorResponse(400, 'Status inválido.')

  try {
    // A RLS garante que só listas do próprio usuário são visíveis aqui.
    const { data: list, error: listError } = await auth.userClient
      .from('lists')
      .select('id')
      .eq('id', listId)
      .maybeSingle()
    if (listError) throw listError
    if (!list) return errorResponse(404, 'Lista não encontrada.')

    const details = await tmdbGet(`/${mediaType}/${tmdbId}`, { language: TMDB_LANGUAGE })
    const media = normalizeMedia({ ...details, id: tmdbId }, mediaType as MediaType)
    if (!media.title) return errorResponse(502, 'Não foi possível obter os dados da obra.')

    // Catálogo compartilhado: escrita apenas com service role.
    const admin = createAdminClient()
    const { data: saved, error: mediaError } = await admin
      .from('media')
      .upsert(media, { onConflict: 'tmdb_id,media_type' })
      .select('id')
      .single()
    if (mediaError) throw mediaError

    const { error: linkError } = await auth.userClient.from('list_media').insert({
      list_id: listId,
      media_id: saved.id,
      status,
      watched_at: status === 'ASSISTIDO' ? new Date().toISOString() : null,
    })

    if (linkError) {
      // Violação da constraint (list_id, media_id): a obra já está nesta lista.
      if (linkError.code === '23505') return json({ media_id: saved.id, already_in_list: true })
      throw linkError
    }
    return json({ media_id: saved.id, already_in_list: false })
  } catch (error) {
    if (error instanceof TmdbError && error.status === 404) return errorResponse(404, 'Obra não encontrada no catálogo.')
    console.error('add-media falhou:', error instanceof Error ? error.message : 'erro desconhecido')
    return errorResponse(500, 'Não foi possível adicionar a obra. Tente novamente.')
  }
})
