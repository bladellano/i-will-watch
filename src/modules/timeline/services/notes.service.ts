import { requestError } from '@/services/network'
import { supabase } from '@/services/supabase/client'

/**
 * Os comentários da timeline são as Observações da obra (`list_media.notes`). O banco decide a publicação:
 * texto novo ou editado entra na timeline, e a edição de um comentário já publicado ganha "(editado)".
 */
export async function updateNote(itemId: string, notes: string): Promise<{ notes: string | null; notes_edited_at: string | null }> {
  const { data, error } = await supabase.from('list_media').update({ notes }).eq('id', itemId).select('notes, notes_edited_at')
  if (error?.message?.includes('note_too_long')) throw new Error('O comentário pode ter no máximo 1.000 caracteres.')
  if (error || !data || data.length === 0) throw requestError('Não foi possível salvar o comentário.')
  return data[0] as { notes: string | null; notes_edited_at: string | null }
}

/** Tira o comentário da timeline e mantém o texto nas Observações. Editar o texto e salvar publica de novo. */
export async function hideNoteFromTimeline(itemId: string): Promise<void> {
  const { data, error } = await supabase.from('list_media').update({ notes_hidden: true }).eq('id', itemId).select('id')
  if (error || !data || data.length === 0) throw requestError('Não foi possível tirar o comentário da timeline.')
}
