import { supabase } from '@/services/supabase/client'
import type { ListItem, ListItemPatch } from '../types'

const ITEM_SELECT = `
  id, status, personal_rating, notes, added_at, watched_at,
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
  if (error) throw new Error('Não foi possível carregar as obras da lista.')
  return (data ?? []) as unknown as ListItem[]
}

export async function fetchListItem(listId: string, itemId: string): Promise<ListItem | null> {
  const { data, error } = await supabase
    .from('list_media')
    .select(ITEM_SELECT)
    .eq('list_id', listId)
    .eq('id', itemId)
    .maybeSingle()
  if (error) throw new Error('Não foi possível carregar a obra.')
  return (data as unknown as ListItem | null) ?? null
}

export async function updateListItem(itemId: string, patch: ListItemPatch): Promise<void> {
  const { data, error } = await supabase.from('list_media').update(patch).eq('id', itemId).select('id')
  if (error || !data || data.length === 0) throw new Error('Não foi possível salvar as alterações.')
}

/** Remove apenas o vínculo; a obra continua em `media` e nas demais listas. */
export async function removeListItem(itemId: string): Promise<void> {
  const { data, error } = await supabase.from('list_media').delete().eq('id', itemId).select('id')
  if (error || !data || data.length === 0) throw new Error('Não foi possível remover a obra da lista.')
}
