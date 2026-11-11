/** ISO (timestamptz) -> "AAAA-MM-DD" no fuso local, para <input type="date">. */
export function isoToDateInput(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** "AAAA-MM-DD" (local) -> ISO ao meio-dia local, evitando virar o dia por fuso. */
export function dateInputToIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function todayDateInput(): string {
  return isoToDateInput(new Date().toISOString())
}
