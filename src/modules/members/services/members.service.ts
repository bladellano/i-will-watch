import { requestError } from '@/services/network'
import { supabase } from '@/services/supabase/client'
import type { MemberList, MemberListItem, RecentMember } from '../types'

/** Listas de um membro que compartilha. A função devolve vazio se ele não compartilha. */
export async function fetchMemberLists(memberId: string): Promise<MemberList[]> {
  const { data, error } = await supabase.rpc('member_lists', { p_member_id: memberId })
  if (error) throw requestError('Não foi possível carregar as listas deste membro.')
  return (data ?? []) as MemberList[]
}

export async function fetchMemberListItems(listId: string): Promise<MemberListItem[]> {
  const { data, error } = await supabase.rpc('member_list_items', { p_list_id: listId })
  if (error) throw requestError('Não foi possível carregar as obras desta lista.')
  return (data ?? []) as MemberListItem[]
}

/** Últimos membros cadastrados, mais recentes primeiro. */
export async function fetchRecentMembers(limit = 25): Promise<RecentMember[]> {
  const { data, error } = await supabase.rpc('recent_members', { max_items: limit })
  if (error) throw requestError('Não foi possível carregar os membros cadastrados.')
  return (data ?? []) as RecentMember[]
}
