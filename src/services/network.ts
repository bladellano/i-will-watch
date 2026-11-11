/** Erro com mensagem adequada: avisa quando o motivo provável é falta de conexão. */
export function requestError(fallback: string): Error {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return new Error('Sem conexão com a internet. Conecte-se e tente novamente.')
  }
  return new Error(fallback)
}
