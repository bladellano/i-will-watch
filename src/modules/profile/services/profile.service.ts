import { requestError } from '@/services/network'
import { supabase } from '@/services/supabase/client'

export async function fetchProfileName(userId: string): Promise<string | null> {
  const { data, error } = await supabase.from('profiles').select('name').eq('id', userId).maybeSingle()
  if (error) throw requestError('Não foi possível carregar seu perfil.')
  return data?.name ?? null
}

export async function updateProfileName(userId: string, name: string): Promise<void> {
  const { data, error } = await supabase.from('profiles').update({ name }).eq('id', userId).select('id')
  if (error || !data || data.length === 0) throw requestError('Não foi possível salvar seu nome.')
}

export async function fetchShareLists(userId: string): Promise<boolean> {
  const { data, error } = await supabase.from('profiles').select('share_lists').eq('id', userId).maybeSingle()
  if (error) throw requestError('Não foi possível carregar sua preferência de compartilhamento.')
  return data?.share_lists ?? false
}

export async function updateShareLists(userId: string, share: boolean): Promise<void> {
  const { data, error } = await supabase.from('profiles').update({ share_lists: share }).eq('id', userId).select('id')
  if (error || !data || data.length === 0) throw requestError('Não foi possível salvar sua preferência de compartilhamento.')
}

export async function fetchShareActivity(userId: string): Promise<boolean> {
  const { data, error } = await supabase.from('profiles').select('share_activity').eq('id', userId).maybeSingle()
  if (error) throw requestError('Não foi possível carregar sua preferência de atividade.')
  return data?.share_activity ?? false
}

export async function updateShareActivity(userId: string, share: boolean): Promise<void> {
  const { data, error } = await supabase.from('profiles').update({ share_activity: share }).eq('id', userId).select('id')
  if (error || !data || data.length === 0) throw requestError('Não foi possível salvar sua preferência de atividade.')
}
