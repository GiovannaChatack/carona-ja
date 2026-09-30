// Normalização e validação dos dados de passageiros (contracts/acoes.md → "Funções de domínio").
// Funções puras, sem acesso ao banco; o banco repete as regras essenciais em checks.

import { colapsarEspacos, parseValorEmCentavos, type Resultado } from '@/lib/validacao'

import type { CamposPassageiro } from './tipos'

// As regras genéricas vivem em lib/validacao.ts; reexportadas para as importações existentes.
export {
  centavosParaCampo,
  colapsarEspacos,
  ehUuid,
  parseValorEmCentavos,
  type Resultado,
} from '@/lib/validacao'

const NOME_MAX = 80
const OBSERVACAO_MAX = 200

const ERRO_TELEFONE = 'Informe um telefone com DDD, ex.: (11) 91234-5678.'

// DDD sem zero + 8 dígitos (fixo) ou 9 + 8 dígitos (celular). Igual ao check da migração.
const TELEFONE = /^[1-9]{2}(9[0-9]{8}|[0-9]{8})$/

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
