import { authenticate, createAdminClient } from '../_shared/auth.ts'
import { corsHeaders, errorResponse, json, readJson } from '../_shared/http.ts'
import { identifyWithOpenAi, type AiCandidate } from '../_shared/openai.ts'
import { normalizeMedia, TMDB_LANGUAGE, tmdbGet, type NormalizedMedia } from '../_shared/tmdb.ts'

const AI_LIMIT = 10 // identificacoes por usuario...
const AI_WINDOW_HOURS = 24 // ...a cada 24 horas
const STALE_PROCESSING_MS = 5 * 60 * 1000
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp']
const MAX_MATCHES = 6
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const GENERIC_FAILURE = 'Não foi possível identificar a obra. Tente novamente ou busque manualmente.'

type Match = NormalizedMedia & { confidence: AiCandidate['confidence'] }

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return btoa(binary)
}

async function searchOnce(type: AiCandidate['media_type'], query: string, year: number | null) {
  const base = { query, language: TMDB_LANGUAGE, include_adult: false }
  if (type === 'movie') {
    const data = await tmdbGet('/search/movie', year ? { ...base, year } : base)
    return (data.results ?? []).map((r: Record<string, unknown>) => normalizeMedia(r, 'movie'))
  }
  if (type === 'tv') {
    const data = await tmdbGet('/search/tv', year ? { ...base, first_air_date_year: year } : base)
    return (data.results ?? []).map((r: Record<string, unknown>) => normalizeMedia(r, 'tv'))
  }
  const data = await tmdbGet('/search/multi', base)
  return (data.results ?? [])
    .filter((r: { media_type?: string }) => r.media_type === 'movie' || r.media_type === 'tv')
    .map((r: { media_type: 'movie' | 'tv' }) => normalizeMedia(r, r.media_type))
}

/** Procura o candidato no TMDB: título em pt-BR, depois original; com ano e depois sem ano. */
async function findInTmdb(candidate: AiCandidate): Promise<NormalizedMedia[]> {
  try {
    const queries = [...new Set([candidate.title, candidate.original_title].filter((q): q is string => !!q))]
    const years = candidate.year ? [candidate.year, null] : [null]
    for (const query of queries) {
      for (const year of years) {
        const found = await searchOnce(candidate.media_type, query, year)
        if (found.length > 0) return found.slice(0, 3)
      }
    }
  } catch (error) {
    console.error('busca TMDB falhou:', error instanceof Error ? error.message : 'erro desconhecido')
  }
  return []
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return errorResponse(405, 'Método não permitido.')

  const auth = await authenticate(req)
  if (!auth) return errorResponse(401, 'Não autenticado.')

  const body = await readJson(req)
  const captureId = body?.capture_id
  if (typeof captureId !== 'string' || !UUID_RE.test(captureId)) return errorResponse(400, 'Captura inválida.')

  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) {
    console.error('OPENAI_API_KEY não configurada.')
    return errorResponse(500, 'A identificação por IA não está configurada.')
  }
  const model = Deno.env.get('OPENAI_MODEL') || 'gpt-5-mini'

  try {
    // A RLS garante que só capturas do próprio usuário são visíveis.
    const { data: capture, error: readError } = await auth.userClient
      .from('capture_requests')
      .select('id, status, image_path, input_title, input_url, source')
      .eq('id', captureId)
      .maybeSingle()
    if (readError) throw readError
    if (!capture) return errorResponse(404, 'Captura não encontrada.')

    if (capture.status === 'needs_review' || capture.status === 'completed') {
      return errorResponse(409, 'Esta captura já foi processada.')
    }
    if (!capture.image_path && !capture.input_title && !capture.input_url) {
      return errorResponse(400, 'A captura não tem imagem, título nem URL para identificar.')
    }
    if (capture.image_path && !capture.image_path.startsWith(`${auth.user.id}/`)) {
      return errorResponse(400, 'Imagem inválida.')
    }

    const admin = createAdminClient()

    // Teto de uso: AI_LIMIT identificações por AI_WINDOW_HOURS (janela móvel).
    const since = new Date(Date.now() - AI_WINDOW_HOURS * 3600 * 1000).toISOString()
    const { count, error: countError } = await admin
      .from('ai_usage_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.user.id)
      .gte('created_at', since)
    if (countError) throw countError
    if ((count ?? 0) >= AI_LIMIT) {
      return errorResponse(429, `Limite de ${AI_LIMIT} identificações por IA a cada 24 horas atingido. Use a busca manual.`)
    }

    // Reserva atômica: evita execuções duplicadas (duplo clique, duas abas).
    const staleIso = new Date(Date.now() - STALE_PROCESSING_MS).toISOString()
    const { data: claimed, error: claimError } = await admin
      .from('capture_requests')
      .update({ status: 'processing', processed_at: new Date().toISOString(), error_message: null })
      .eq('id', captureId)
      .eq('user_id', auth.user.id)
      .or(`status.in.(pending,failed),and(status.eq.processing,processed_at.lt.${staleIso})`)
      .select('id')
    if (claimError) throw claimError
    if (!claimed || claimed.length === 0) return errorResponse(409, 'Esta captura já está em processamento.')

    const markFailed = async (message: string) => {
      await admin
        .from('capture_requests')
        .update({ status: 'failed', error_message: message, processed_at: new Date().toISOString() })
        .eq('id', captureId)
    }

    try {
      let imageDataUrl: string | null = null
      if (capture.image_path) {
        const { data: blob, error: downloadError } = await admin.storage.from('captures').download(capture.image_path)
        if (downloadError || !blob) throw new Error('imagem indisponível')
        if (blob.size > MAX_IMAGE_BYTES) throw new Error('imagem acima do limite')
        const mime = ALLOWED_MIME.includes(blob.type) ? blob.type : null
        if (!mime) throw new Error('tipo de imagem não permitido')
        imageDataUrl = `data:${mime};base64,${toBase64(new Uint8Array(await blob.arrayBuffer()))}`
      }

      const outcome = await identifyWithOpenAi({
        apiKey,
        model,
        imageDataUrl,
        title: capture.input_title,
        url: capture.input_url,
        source: capture.source,
      })

      await admin.from('ai_usage_log').insert({
        user_id: auth.user.id,
        capture_id: captureId,
        model: outcome.model,
        input_tokens: outcome.input_tokens,
        output_tokens: outcome.output_tokens,
      })

      const perCandidate = await Promise.all(outcome.candidates.map((c) => findInTmdb(c)))
      const matches: Match[] = []
      const seen = new Set<string>()
      outcome.candidates.forEach((candidate, index) => {
        for (const media of perCandidate[index] ?? []) {
          const key = `${media.media_type}:${media.tmdb_id}`
          if (seen.has(key) || matches.length >= MAX_MATCHES) continue
          seen.add(key)
          matches.push({ ...media, confidence: candidate.confidence })
        }
      })

      const aiResult = { model: outcome.model, candidates: outcome.candidates, matches }
      if (matches.length === 0) {
        const message = 'A IA não encontrou candidatos. Busque manualmente pelo título.'
        await admin
          .from('capture_requests')
          .update({ status: 'failed', error_message: message, ai_result: aiResult, processed_at: new Date().toISOString() })
          .eq('id', captureId)
        return json({ status: 'failed', matches: 0 })
      }

      await admin
        .from('capture_requests')
        .update({ status: 'needs_review', error_message: null, ai_result: aiResult, processed_at: new Date().toISOString() })
        .eq('id', captureId)
      return json({ status: 'needs_review', matches: matches.length })
    } catch (error) {
      console.error('identify-media falhou:', error instanceof Error ? error.message : 'erro desconhecido')
      await markFailed(GENERIC_FAILURE)
      return errorResponse(502, GENERIC_FAILURE)
    }
  } catch (error) {
    console.error('identify-media erro:', error instanceof Error ? error.message : 'erro desconhecido')
    return errorResponse(500, 'Não foi possível processar a captura. Tente novamente.')
  }
})
