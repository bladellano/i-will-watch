import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { authenticate, createAdminClient } from '../_shared/auth.ts'
import { corsHeaders, errorResponse, json, readJson } from '../_shared/http.ts'
import { normalizeMedia, TMDB_LANGUAGE, TmdbError, tmdbGet, type MediaType } from '../_shared/tmdb.ts'

const STATUSES = ['ASSISTIR', 'ARQUIVADO', 'ASSISTIDO'] as const
type Status = (typeof STATUSES)[number]
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Conclui a captura e apaga a imagem do Storage (só guardada enquanto necessária). */
async function completeCapture(
  admin: SupabaseClient,
  capture: { id: string; image_path: string | null },
  mediaId: string,
) {
  try {
    const patch: Record<string, unknown> = { status: 'completed', selected_media_id: mediaId, error_message: null }
    if (capture.image_path) {
      const { error } = await admin.storage.from('captures').remove([capture.image_path])
      if (!error) patch.image_path = null
    }
    await admin.from('capture_requests').update(patch).eq('id', capture.id)
  } catch (error) {
    console.error('conclusão da captura falhou:', error instanceof Error ? error.message : 'erro desconhecido')
  }
}

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
  const captureId = body?.capture_id ?? null

  if (!Number.isInteger(tmdbId) || (tmdbId as number) <= 0) return errorResponse(400, 'Obra inválida.')
  if (mediaType !== 'movie' && mediaType !== 'tv') return errorResponse(400, 'Tipo de obra inválido.')
  if (typeof listId !== 'string' || !UUID_RE.test(listId)) return errorResponse(400, 'Lista inválida.')
  if (!STATUSES.includes(status)) return errorResponse(400, 'Status inválido.')
  if (captureId !== null && (typeof captureId !== 'string' || !UUID_RE.test(captureId))) {
    return errorResponse(400, 'Captura inválida.')
  }

  try {
    // A RLS garante que só listas do próprio usuário são visíveis aqui.
    const { data: list, error: listError } = await auth.userClient
      .from('lists')
      .select('id')
      .eq('id', listId)
      .maybeSingle()
    if (listError) throw listError
    if (!list) return errorResponse(404, 'Lista não encontrada.')

    // Captura opcional: precisa ser do próprio usuário (RLS).
    let capture: { id: string; status: string; image_path: string | null } | null = null
    if (typeof captureId === 'string') {
      const { data, error: captureError } = await auth.userClient
        .from('capture_requests')
        .select('id, status, image_path')
        .eq('id', captureId)
        .maybeSingle()
      if (captureError) throw captureError
      if (!data) return errorResponse(404, 'Captura não encontrada.')
      capture = data
    }

    const details = await tmdbGet(`/${mediaType}/${tmdbId}`, { language: TMDB_LANGUAGE })
    const media = normalizeMedia({ ...details, id: tmdbId }, mediaType as MediaType)
    // Gêneros vêm no endpoint de detalhes como [{ id, name }]; guardamos apenas os nomes.
    const genres: string[] = Array.isArray(details.genres)
      ? details.genres
          .map((genre: { name?: unknown }) => genre.name)
          .filter((name: unknown): name is string => typeof name === 'string' && name !== '')
      : []
    if (!media.title) return errorResponse(502, 'Não foi possível obter os dados da obra.')

    // Catálogo compartilhado: escrita apenas com service role.
    const admin = createAdminClient()
    const { data: saved, error: mediaError } = await admin
      .from('media')
      .upsert({ ...media, genres }, { onConflict: 'tmdb_id,media_type' })
      .select('id')
      .single()
    if (mediaError) throw mediaError

    const { error: linkError } = await auth.userClient.from('list_media').insert({
      list_id: listId,
      media_id: saved.id,
      status,
      watched_at: status === 'ASSISTIDO' ? new Date().toISOString() : null,
    })

    const alreadyInList = linkError?.code === '23505' // constraint (list_id, media_id)
    if (linkError && !alreadyInList) throw linkError

    if (capture && capture.status !== 'completed') await completeCapture(admin, capture, saved.id)
    return json({ media_id: saved.id, already_in_list: alreadyInList })
  } catch (error) {
    if (error instanceof TmdbError && error.status === 404) return errorResponse(404, 'Obra não encontrada no catálogo.')
    console.error('add-media falhou:', error instanceof Error ? error.message : 'erro desconhecido')
    return errorResponse(500, 'Não foi possível adicionar a obra. Tente novamente.')
  }
})
