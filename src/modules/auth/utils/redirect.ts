/** Aceita apenas caminhos internos, para evitar redirecionamento para outro domínio. */
export function safeRedirect(value: unknown): string {
  const path = typeof value === 'string' ? value : ''
  return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\') ? path : '/'
}
