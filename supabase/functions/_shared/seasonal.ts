// Textos das notificações sazonais. Arquivo puro (sem imports): testável fora do Deno.
// Para criar uma ocasião nova, acrescente uma entrada em OCCASIONS.

export interface OccasionCopy {
  subject: string
  /** Chamada principal, ligada à época do ano. */
  headline: string
  /** Frase que apresenta as sugestões do catálogo. */
  suggestionsIntro: string
}

export const OCCASIONS = {
  natal: {
    subject: 'Crie sua lista para o Natal',
    headline: 'O Natal está chegando! Crie sua lista e escolha o que assistir durante as festas.',
    suggestionsIntro: 'Para começar, veja as obras adicionadas mais recentemente no app:',
  },
  ano_novo: {
    subject: 'Comece o ano com uma nova lista',
    headline: 'Ano novo, lista nova! Separe os filmes e séries que você quer assistir nos próximos meses.',
    suggestionsIntro: 'Algumas ideias recentes do app para abrir o ano:',
  },
  carnaval: {
    subject: 'Sua lista para o Carnaval',
    headline: 'Vai aproveitar o Carnaval para descansar? Prepare uma lista para os dias de folga.',
    suggestionsIntro: 'Veja as obras adicionadas mais recentemente no app:',
  },
  pascoa: {
    subject: 'Uma lista para a Páscoa',
    headline: 'A Páscoa é uma ótima ocasião para assistir algo em família. Monte sua seleção com antecedência.',
    suggestionsIntro: 'Sugestões recentes do app para a sua lista:',
  },
  namorados: {
    subject: 'Uma lista a dois',
    headline: 'Dia dos Namorados chegando: que tal montar uma lista para assistir a dois?',
    suggestionsIntro: 'Algumas obras adicionadas recentemente no app:',
  },
  feriado: {
    subject: 'Organize-se para este feriado',
    headline: 'Organize-se para este feriado e prepare uma seleção de filmes e séries para aproveitar os dias de descanso.',
    suggestionsIntro: 'Para ajudar na escolha, veja as obras adicionadas mais recentemente no app:',
  },
  ferias: {
    subject: 'Sua lista para as férias',
    headline: 'Férias chegando! Aproveite para montar a lista do que você quer assistir com calma.',
    suggestionsIntro: 'Veja as obras adicionadas mais recentemente no app:',
  },
  viagem: {
    subject: 'Vai viajar? Prepare sua lista',
    headline: 'Vai viajar? Antes de partir, prepare sua lista com as obras que deseja assistir.',
    suggestionsIntro: 'Algumas sugestões recentes do app para levar na viagem:',
  },
} as const satisfies Record<string, OccasionCopy>

export type Occasion = keyof typeof OCCASIONS

export const OCCASION_NAMES = Object.keys(OCCASIONS) as Occasion[]

export function isOccasion(value: unknown): value is Occasion {
  return typeof value === 'string' && Object.hasOwn(OCCASIONS, value)
}
