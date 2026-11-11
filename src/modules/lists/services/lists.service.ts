import { requestError } from '@/services/network'
import { supabase } from '@/services/supabase/client'
import type { ListDetails, ListSummary, UserList } from '../types'

interface RawListRow {
  id: string
  name: string
  description: string | null
  is_default: boolean
  list_media?: { count: number }[]
}

/** Listas do usuário autenticado (a RLS filtra por user_id). A lista default vem primeiro. */
export async function fetchLists(): Promise<UserList[]> {
  const { data, error } = await supabase
    .from('lists')
    .select('id, name, is_default')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })
  if (error) throw requestError('Não foi possível carregar suas listas.')
  return (data ?? []) as UserList[]
}

export async function fetchListSummaries(): Promise<ListSummary[]> {
  const { data, error } = await supabase
    .from('lists')
    .select('id, name, description, is_default, list_media(count)')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })
  if (error) throw requestError('Não foi possível carregar suas listas.')
  return ((data ?? []) as unknown as RawListRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    is_default: row.is_default,
    item_count: row.list_media?.[0]?.count ?? 0,
  }))
}

export async function fetchList(id: string): Promise<ListDetails | null> {
  const { data, error } = await supabase
    .from('lists')
    .select('id, name, description, is_default')
    .eq('id', id)
    .maybeSingle()
  if (error) throw requestError('Não foi possível carregar a lista.')
  return (data as ListDetails | null) ?? null
}

export interface ListInput {
  name: string
  description: string
}

function cleanInput(input: ListInput) {
  const name = input.name.trim()
  if (!name) throw new Error('Informe um nome para a lista.')
  return { name, description: input.description.trim() || null }
}

export async function createList(input: ListInput): Promise<void> {
  const { error } = await supabase.from('lists').insert(cleanInput(input))
  if (error) throw requestError('Não foi possível criar a lista.')
}

export async function updateList(id: string, input: ListInput): Promise<void> {
  const { data, error } = await supabase.from('lists').update(cleanInput(input)).eq('id', id).select('id')
  if (error || !data || data.length === 0) throw requestError('Não foi possível salvar a lista.')
}

/** A RLS impede excluir a lista default: nesse caso nenhuma linha é afetada. */
export async function deleteList(id: string): Promise<void> {
  const { data, error } = await supabase.from('lists').delete().eq('id', id).select('id')
  if (error || !data || data.length === 0) throw requestError('Não foi possível excluir a lista.')
}
