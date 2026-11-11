export type RatingParse = { ok: true; value: number | null } | { ok: false }

/**
 * Interpreta a nota digitada. O v-model de <input type="number"> entrega número
 * (não string) depois da edição, então aceita ambos. Vazio = sem nota.
 */
export function parseRating(raw: string | number | null | undefined): RatingParse {
  const text = String(raw ?? '').trim()
  if (text === '') return { ok: true, value: null }
  const value = Number(text)
  if (!Number.isInteger(value) || value < 1 || value > 10) return { ok: false }
  return { ok: true, value }
}
