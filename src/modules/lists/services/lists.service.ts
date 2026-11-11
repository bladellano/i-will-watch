import { supabase } from '@/services/supabase/client'
import type { UserList } from '../types'

/** Listas do usuário autenticado (a RLS filtra por user_id). A lista default vem primeiro. */
export async function fetchLists(): Promise<UserList[]> {
  const { data, error } = await supabase
    .from('lists')
    .select('id, name, is_default')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })
  if (error) throw new Error('Não foi possível carregar suas listas.')
  return data ?? []
}
