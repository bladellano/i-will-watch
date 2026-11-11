import { requestError } from '@/services/network'
import { supabase } from '@/services/supabase/client'

export interface Credentials {
  email: string
  password: string
}

/** Mensagem genérica: não expõe detalhes internos do provedor ao usuário. */
function toFriendlyError(error: { message: string; code?: string }): Error {
  const code = error.code ?? ''
  if (code === 'invalid_credentials') return new Error('E-mail ou senha inválidos.')
  if (code === 'email_not_confirmed') return new Error('Confirme seu e-mail antes de entrar.')
  if (code === 'user_already_exists') return new Error('Já existe uma conta com este e-mail.')
  if (code === 'weak_password') return new Error('Senha muito fraca. Use ao menos 6 caracteres.')
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit')
    return new Error('Muitas tentativas. Aguarde um instante e tente novamente.')
  return requestError('Não foi possível concluir a operação. Tente novamente.')
}

export async function signIn({ email, password }: Credentials) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw toFriendlyError(error)
}

/** Retorna true quando a sessão já foi aberta; false quando exige confirmação por e-mail. */
export async function signUp({ email, password, name }: Credentials & { name?: string }): Promise<boolean> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: name ? { name } : undefined },
  })
  if (error) throw toFriendlyError(error)
  return data.session !== null
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw toFriendlyError(error)
}
