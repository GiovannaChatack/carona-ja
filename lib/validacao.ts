// Regras genéricas de validação compartilhadas pelos recursos (research §12).
// Funções puras, sem acesso ao banco; o banco repete as regras essenciais em checks.

export type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: string }

export const VALOR_MAX_CENTAVOS = 999999

export const ERRO_VALOR = 'Informe um valor entre R$ 0,00 e R$ 9.999,99, com até 2 casas decimais.'

// Formatos aceitos para o valor (slice 002, research §4):
// - "12", "12,5", "12,50" e "12.50" (um único ponto seguido de 1–2 dígitos é decimal);
// - "1.234,56": ponto como milhar só em grupos de 3 dígitos seguidos de vírgula.
export const VALOR_SIMPLES = /^(\d+)(?:[,.](\d{1,2}))?$/
export const VALOR_COM_MILHAR = /^(\d{1,3}(?:\.\d{3})+),(\d{1,2})$/

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function colapsarEspacos(texto: string) {
  return texto.trim().replace(/\s+/g, ' ')
}

// Converte o texto em reais para centavos inteiros sem passar por ponto flutuante.
export function parseValorEmCentavos(
  entrada: string,
  mensagemVazio = 'Informe o valor padrão.',
): Resultado<number> {
  const texto = entrada.trim()
  if (!texto) return { ok: false, erro: mensagemVazio }

  const partes = VALOR_COM_MILHAR.exec(texto) ?? VALOR_SIMPLES.exec(texto)
  if (!partes) return { ok: false, erro: ERRO_VALOR }

  const inteiros = partes[1].replace(/\./g, '').replace(/^0+(?=\d)/, '')
  // Mais de 4 dígitos inteiros já passa de R$ 9.999,99.
  if (inteiros.length > 4) return { ok: false, erro: ERRO_VALOR }

  const centavos = Number(inteiros) * 100 + Number((partes[2] ?? '').padEnd(2, '0'))
  if (centavos > VALOR_MAX_CENTAVOS) return { ok: false, erro: ERRO_VALOR }
  return { ok: true, valor: centavos }
}

// Valor inicial de um campo em reais: 1250 → "12,50" (sem "R$" e sem separador de milhar).
export function centavosParaCampo(centavos: number) {
  const reais = Math.trunc(centavos / 100)
  const resto = String(centavos % 100).padStart(2, '0')
  return `${reais},${resto}`
}

export function ehUuid(texto: string) {
  return UUID.test(texto)
}
