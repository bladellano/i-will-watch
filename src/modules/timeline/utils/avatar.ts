/** Paleta fixa (classes literais, para o Tailwind enxergar). */
const AVATAR_CLASSES = [
  'bg-indigo-500/25 text-indigo-200',
  'bg-emerald-500/25 text-emerald-200',
  'bg-amber-500/25 text-amber-200',
  'bg-rose-500/25 text-rose-200',
  'bg-sky-500/25 text-sky-200',
  'bg-fuchsia-500/25 text-fuchsia-200',
] as const

/** Inicial maiúscula do primeiro nome; '?' se vazio. */
export function avatarInitial(name: string): string {
  const first = name.trim().charAt(0)
  return first ? first.toLocaleUpperCase('pt-BR') : '?'
}

/** Cor estável por nome: o mesmo membro tem sempre a mesma cor. */
export function avatarClass(name: string): string {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return AVATAR_CLASSES[hash % AVATAR_CLASSES.length] ?? AVATAR_CLASSES[0]
}
