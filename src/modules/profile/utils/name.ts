export const NAME_MAX_LENGTH = 80

/** Remove espaços extras; devolve null quando vazio. Usado para exibir e salvar. */
export function normalizeName(raw: string | null | undefined): string | null {
  const name = (raw ?? '').replace(/\s+/g, ' ').trim()
  return name === '' ? null : name
}

export function isValidName(raw: string | null | undefined): boolean {
  const name = normalizeName(raw)
  return name !== null && name.length <= NAME_MAX_LENGTH
}

/** Nome para exibir: o nome do perfil ou, na falta dele, o e-mail. */
export function displayName(name: string | null | undefined, email: string | null | undefined): string {
  return normalizeName(name) ?? email ?? ''
}
