export const COMMENT_MAX_LENGTH = 1000

/** Texto simples de 1 a 1.000 caracteres (depois de aparar os espaços das pontas). */
export function isValidComment(raw: string): boolean {
  const length = raw.trim().length
  return length >= 1 && length <= COMMENT_MAX_LENGTH
}
