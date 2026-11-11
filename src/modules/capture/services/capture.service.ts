import { supabase } from '@/services/supabase/client'
import { invokeFunction } from '@/services/supabase/functions'
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, type Capture } from '../types'

const BUCKET = 'captures'
const CAPTURE_SELECT =
  'id, image_path, input_title, input_url, source, status, ai_result, selected_media_id, error_message, created_at, processed_at'
const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

export function validateImage(file: File): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) return 'Use uma imagem JPEG, PNG ou WebP.'
  if (file.size > MAX_IMAGE_BYTES) return 'A imagem deve ter no máximo 5 MB.'
  return null
}

/** Aceita apenas http/https. Retorna null quando vazio; lança erro se inválida. */
export function normalizeUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error('Informe uma URL válida (começando com http:// ou https://).')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Informe uma URL válida (começando com http:// ou https://).')
  }
  if (trimmed.length > 2048) throw new Error('A URL é longa demais.')
  return trimmed
}

export interface NewCapture {
  userId: string
  file: File | null
  title: string
  url: string | null
  source: string
}

/** Salva a captura (imagem no Storage + registro). Não chama a IA. */
export async function createCapture(input: NewCapture): Promise<string> {
  const id = crypto.randomUUID()
  let imagePath: string | null = null

  if (input.file) {
    const invalid = validateImage(input.file)
    if (invalid) throw new Error(invalid)
    imagePath = `${input.userId}/${id}.${EXTENSIONS[input.file.type]}`
    const { error } = await supabase.storage.from(BUCKET).upload(imagePath, input.file, {
      contentType: input.file.type,
      upsert: false,
    })
    if (error) throw new Error('Não foi possível enviar a imagem. Tente novamente.')
  }

  const { error } = await supabase.from('capture_requests').insert({
    id,
    image_path: imagePath,
    input_title: input.title.trim() || null,
    input_url: input.url,
    source: input.source.trim() || null,
  })
  if (error) {
    if (imagePath) await supabase.storage.from(BUCKET).remove([imagePath])
    throw new Error('Não foi possível salvar a captura. Tente novamente.')
  }
  return id
}

export async function fetchOpenCaptures(): Promise<Capture[]> {
  const { data, error } = await supabase
    .from('capture_requests')
    .select(CAPTURE_SELECT)
    .neq('status', 'completed')
    .order('created_at', { ascending: false })
  if (error) throw new Error('Não foi possível carregar as capturas.')
  return (data ?? []) as unknown as Capture[]
}

export async function fetchCapture(id: string): Promise<Capture | null> {
  const { data, error } = await supabase.from('capture_requests').select(CAPTURE_SELECT).eq('id', id).maybeSingle()
  if (error) throw new Error('Não foi possível carregar a captura.')
  return (data as unknown as Capture | null) ?? null
}

export async function getImageUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
  return error ? null : data.signedUrl
}

/** Apaga o arquivo e o registro da captura. */
export async function discardCapture(capture: Capture): Promise<void> {
  if (capture.image_path) {
    const { error } = await supabase.storage.from(BUCKET).remove([capture.image_path])
    if (error) throw new Error('Não foi possível descartar a imagem.')
  }
  const { data, error } = await supabase.from('capture_requests').delete().eq('id', capture.id).select('id')
  if (error || !data || data.length === 0) throw new Error('Não foi possível descartar a captura.')
}

/** Única chamada que envia dados à OpenAI: só deve ser feita após confirmação explícita do usuário. */
export async function identifyCapture(captureId: string): Promise<void> {
  await invokeFunction<{ status: string }>(
    'identify-media',
    { capture_id: captureId },
    'Não foi possível identificar a obra. Tente novamente ou busque manualmente.',
  )
}
