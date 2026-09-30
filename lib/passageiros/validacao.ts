// Normalização e validação dos dados de passageiros (contracts/acoes.md → "Funções de domínio").
// Funções puras, sem acesso ao banco; o banco repete as regras essenciais em checks.

import type { CamposPassageiro } from './tipos'

export type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: string }

const NOME_MAX = 80
const OBSERVACAO_MAX = 200
const VALOR_MAX_CENTAVOS = 999999

const ERRO_TELEFONE = 'Informe um telefone com DDD, ex.: (11) 91234-5678.'
const ERRO_VALOR = 'Informe um valor entre R$ 0,00 e R$ 9.999,99, com até 2 casas decimais.'

// DDD sem zero + 8 dígitos (fixo) ou 9 + 8 dígitos (celular). Igual ao check da migração.
const TELEFONE = /^[1-9]{2}(9[0-9]{8}|[0-9]{8})$/

// Formatos aceitos para o valor (research §4):
// - "12", "12,5", "12,50" e "12.50" (um único ponto seguido de 1–2 dígitos é decimal);
// - "1.234,56": ponto como milhar só em grupos de 3 dígitos seguidos de vírgula.
const VALOR_SIMPLES = /^(\d+)(?:[,.](\d{1,2}))?$/
const VALOR_COM_MILHAR = /^(\d{1,3}(?:\.\d{3})+),(\d{1,2})$/

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function colapsarEspacos(texto: string) {
  return texto.trim().replace(/\s+/g, ' ')
}

export function normalizarNome(entrada: string): Resultado<string> {
  const nome = colapsarEspacos(entrada)
  if (!nome) return { ok: false, erro: 'Informe o nome.' }
  if (nome.length > NOME_MAX) return { ok: false, erro: 'O nome deve ter até 80 caracteres.' }
  return { ok: true, valor: nome }
}

export function normalizarTelefone(entrada: string): Resultado<string> {
  let digitos = entrada.replace(/\D/g, '')
  if (!digitos) return { ok: false, erro: 'Informe o telefone.' }

  // "+55 11 9...." ou "011 9....": remove o código do país ou o zero de discagem.
  if (digitos.length >= 12 && digitos.length <= 13) {
    if (digitos.startsWith('55')) digitos = digitos.slice(2)
    else if (digitos.startsWith('0')) digitos = digitos.slice(1)
  }

  if (!TELEFONE.test(digitos)) return { ok: false, erro: ERRO_TELEFONE }
  return { ok: true, valor: digitos }
}

// Converte o texto em reais para centavos inteiros sem passar por ponto flutuante.
export function parseValorEmCentavos(entrada: string): Resultado<number> {
  const texto = entrada.trim()
  if (!texto) return { ok: false, erro: 'Informe o valor padrão.' }

  const partes = VALOR_COM_MILHAR.exec(texto) ?? VALOR_SIMPLES.exec(texto)
  if (!partes) return { ok: false, erro: ERRO_VALOR }

  const inteiros = partes[1].replace(/\./g, '').replace(/^0+(?=\d)/, '')
  // Mais de 4 dígitos inteiros já passa de R$ 9.999,99.
  if (inteiros.length > 4) return { ok: false, erro: ERRO_VALOR }

  const centavos = Number(inteiros) * 100 + Number((partes[2] ?? '').padEnd(2, '0'))
  if (centavos > VALOR_MAX_CENTAVOS) return { ok: false, erro: ERRO_VALOR }
  return { ok: true, valor: centavos }
}

export function normalizarObservacao(entrada: string): Resultado<string | null> {
  const observacao = entrada.trim()
  if (!observacao) return { ok: true, valor: null }
  if (observacao.length > OBSERVACAO_MAX) {
    return { ok: false, erro: 'A observação deve ter até 200 caracteres.' }
  }
  return { ok: true, valor: observacao }
}

export type DadosPassageiro = {
  nome: string
  telefone: string
  valor_padrao_centavos: number
  observacao: string | null
}

export function validarPassageiro(
  formData: FormData,
):
  | { ok: true; dados: DadosPassageiro }
  | { ok: false; errosCampo: Partial<Record<CamposPassageiro, string>> } {
  const campo = (nome: CamposPassageiro) => String(formData.get(nome) ?? '')

  const nome = normalizarNome(campo('nome'))
  const telefone = normalizarTelefone(campo('telefone'))
  const valor = parseValorEmCentavos(campo('valor'))
  const observacao = normalizarObservacao(campo('observacao'))

  if (nome.ok && telefone.ok && valor.ok && observacao.ok) {
    return {
      ok: true,
      dados: {
        nome: nome.valor,
        telefone: telefone.valor,
        valor_padrao_centavos: valor.valor,
        observacao: observacao.valor,
      },
    }
  }

  const errosCampo: Partial<Record<CamposPassageiro, string>> = {}
  if (!nome.ok) errosCampo.nome = nome.erro
  if (!telefone.ok) errosCampo.telefone = telefone.erro
  if (!valor.ok) errosCampo.valor = valor.erro
  if (!observacao.ok) errosCampo.observacao = observacao.erro
  return { ok: false, errosCampo }
}

// Busca que ignora maiúsculas, acentos e espaços repetidos.
export function normalizarParaBusca(texto: string) {
  return colapsarEspacos(texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase())
}

// Valor inicial do campo de edição: 1250 → "12,50" (sem "R$" e sem separador de milhar).
export function centavosParaCampo(centavos: number) {
  const reais = Math.trunc(centavos / 100)
  const resto = String(centavos % 100).padStart(2, '0')
  return `${reais},${resto}`
}

export function ehUuid(texto: string) {
  return UUID.test(texto)
}
