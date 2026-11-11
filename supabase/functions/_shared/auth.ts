import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2'

export interface AuthContext {
  user: User
  /** Cliente que age como o usuário (respeita RLS). */
  userClient: SupabaseClient
}

/**
 * Valida o JWT do usuário dentro da função. A identidade vem sempre do token,
 * nunca de campos enviados pelo frontend.
 */
export async function authenticate(req: Request): Promise<AuthContext | null> {
  const authorization = req.headers.get('Authorization') ?? ''
  const token = authorization.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null

  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!url || !anonKey) return null

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await userClient.auth.getUser(token)
  if (error || !data.user) return null
  return { user: data.user, userClient }
}

/** Cliente com service role: usar somente para escrever em `media`. */
export function createAdminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) throw new Error('Configuração do Supabase ausente.')
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
}
