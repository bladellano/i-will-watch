import { requestError } from '@/services/network'
import { supabase } from '@/services/supabase/client'
import type { ListItem, ListItemNoteFields, ListItemPatch } from '../types'

const ITEM_SELECT = `
  id, status, personal_rating, notes, added_at, watched_at, is_pinned,
  notes_published_at, notes_edited_at, notes_hidden,
  media:media_id (
    id, tmdb_id, media_type, title, original_title, release_date,
    overview, poster_path, backdrop_path, tmdb_rating, genres
  )
`

export async function fetchListItems(listId: string): Promise<ListItem[]> {
  const { data, error } = await supabase
    .from('list_media')
    .select(ITEM_SELECT)
    .eq('list_id', listId)
    .order('added_at', { ascending: false })
  if (error) throw requestError('Não foi possível carregar as obras da lista.')
  return (data ?? []) as unknown as ListItem[]
}

export async function fetchListItem(listId: string, itemId: string): Promise<ListItem | null> {
  const { data, error } = await supabase
    .from('list_media')
    .select(ITEM_SELECT)
    .eq('list_id', listId)
    .eq('id', itemId)
    .maybeSingle()
  if (error) throw requestError('Não foi possível carregar a obra.')
  return (data as unknown as ListItem | null) ?? null
}

/** Salva os dados do usuário. Devolve o estado das Observações calculado pelo banco (publicada, editada, escondida). */
export async function updateListItem(itemId: string, patch: ListItemPatch): Promise<ListItemNoteFields> {
  const { data, error } = await supabase
    .from('list_media')
    .update(patch)
    .eq('id', itemId)
    .select('notes, notes_published_at, notes_edited_at, notes_hidden')
  if (error?.message?.includes('note_too_long')) throw new Error('As observações podem ter no máximo 1.000 caracteres.')
  if (error || !data || data.length === 0) throw requestError('Não foi possível salvar as alterações.')
  return data[0] as ListItemNoteFields
}

export async function setListItemPinned(itemId: string, pinned: boolean): Promise<void> {
  const { data, error } = await supabase.from('list_media').update({ is_pinned: pinned }).eq('id', itemId).select('id')
  if (error || !data || data.length === 0) throw requestError('Não foi possível atualizar o destaque da obra.')
}

/** Remove apenas o vínculo; a obra continua em `media` e nas demais listas. */
export async function removeListItem(itemId: string): Promise<void> {
  const { data, error } = await supabase.from('list_media').delete().eq('id', itemId).select('id')
  if (error || !data || data.length === 0) throw requestError('Não foi possível remover a obra da lista.')
}
