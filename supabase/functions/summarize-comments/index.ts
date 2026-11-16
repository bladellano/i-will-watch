import { authenticate, createAdminClient } from '../_shared/auth.ts'
import { corsHeaders, errorResponse, json, readJson } from '../_shared/http.ts'
import {
  commentsHash,
  MAX_COMMENTS,
  MIN_COMMENTS,
  summarizeWithOpenAi,
  type PublicComment,
} from '../_shared/comment-summary.ts'

// Resumo dos comentários de uma obra, igual para todos os membros.
// Fluxo: lê os comentários públicos -> se o conjunto é o mesmo do cache, devolve o cache -> senão gera de novo.
// Um resumo feito com comentários que deixaram de ser públicos nunca é devolvido (o hash deixa de bater).

const SUMMARY_LIMIT = 30 // gerações por usuário...
const SUMMARY_WINDOW_HOURS = 24 // ...a cada 24 horas (só conta quando a IA é chamada; cache não conta)
const GENERIC_FAILURE = 'Não foi possível gerar o resumo dos comentários agora.'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return errorResponse(405, 'Método não permitido.')

  const auth = await authenticate(req)
  if (!auth) return errorResponse(401, 'Não autenticado.')

  const body = await readJson(req)
  const tmdbId = body?.tmdb_id
  const mediaType = body?.media_type
  if (!Number.isSafeInteger(tmdbId) || (tmdbId as number) <= 0 || (mediaType !== 'movie' && mediaType !== 'tv')) {
    return errorResponse(400, 'Obra inválida.')
  }

  try {
    const admin = createAdminClient()

    const { data: media, error: mediaError } = await admin
      .from('media')
      .select('id, title, media_type')
      .eq('tmdb_id', tmdbId)
      .eq('media_type', mediaType)
      .maybeSingle()
    if (mediaError) throw mediaError
    if (!media) return json({ status: 'insufficient', comment_count: 0 })

    const { data: rows, error: commentsError } = await admin.rpc('media_public_comments', {
      p_media_id: media.id,
      p_limit: MAX_COMMENTS,
    })
    if (commentsError) throw commentsError
    const comments: PublicComment[] = (rows ?? []).map((r: { item_id: string; body: string }) => ({
      item_id: r.item_id,
      body: r.body,
    }))

    if (comments.length < MIN_COMMENTS) {
      return json({ status: 'insufficient', comment_count: comments.length })
    }

    const hash = await commentsHash(comments)
    const { data: cached, error: cacheError } = await admin
      .from('media_comment_summaries')
      .select('summary, highlights, comment_count, source_hash, generated_at')
      .eq('media_id', media.id)
      .maybeSingle()
    if (cacheError) throw cacheError
    if (cached && cached.source_hash === hash) {
      return json({
        status: 'ready',
        summary: cached.summary,
        highlights: cached.highlights,
        comment_count: cached.comment_count,
        generated_at: cached.generated_at,
      })
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) {
      console.error('OPENAI_API_KEY não configurada.')
      return errorResponse(503, 'O resumo por IA não está configurado.')
    }
    const model = Deno.env.get('OPENAI_MODEL') || 'gpt-5-mini'

    // Teto de uso por usuário (janela móvel). Só gerações contam.
    const since = new Date(Date.now() - SUMMARY_WINDOW_HOURS * 3600 * 1000).toISOString()
    const { count, error: countError } = await admin
      .from('ai_usage_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.user.id)
      .eq('purpose', 'summary')
      .gte('created_at', since)
    if (countError) throw countError
    if ((count ?? 0) >= SUMMARY_LIMIT) {
      return errorResponse(429, 'O resumo dos comentários está temporariamente indisponível. Tente mais tarde.')
    }

    let outcome
    try {
      outcome = await summarizeWithOpenAi({
        apiKey,
        model,
        title: media.title,
        mediaType: media.media_type,
        comments,
      })
    } catch (error) {
      console.error('summarize-comments IA falhou:', error instanceof Error ? error.message : 'erro desconhecido')
      return errorResponse(502, GENERIC_FAILURE)
    }

    await admin.from('ai_usage_log').insert({
      user_id: auth.user.id,
      purpose: 'summary',
      media_id: media.id,
      model: outcome.model,
      input_tokens: outcome.input_tokens,
      output_tokens: outcome.output_tokens,
    })

    const generatedAt = new Date().toISOString()
    const { error: saveError } = await admin.from('media_comment_summaries').upsert({
      media_id: media.id,
      summary: outcome.summary,
      highlights: outcome.highlights,
      comment_count: comments.length,
      source_hash: hash,
      model: outcome.model,
      generated_at: generatedAt,
    })
    if (saveError) console.error('summarize-comments: cache não salvo:', saveError.message)

    return json({
      status: 'ready',
      summary: outcome.summary,
      highlights: outcome.highlights,
      comment_count: comments.length,
      generated_at: generatedAt,
    })
  } catch (error) {
    console.error('summarize-comments erro:', error instanceof Error ? error.message : 'erro desconhecido')
    return errorResponse(500, GENERIC_FAILURE)
  }
})
