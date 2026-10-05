// Validação dos pagamentos e da chave PIX (contracts/acoes.md → "Funções de domínio").
// Funções puras, sem acesso ao banco; o trigger validar_pagamento repete as regras de data.

import { ehUuid, type Resultado } from '@/lib/validacao'

const DATA = /^(\d{4})-(\d{2})-(\d{2})$/

export const CHAVE_PIX_MAX = 77

// "AAAA-MM-DD" que existe no calendário (ex.: 2026-02-30 não existe).
function dataValida(texto: string) {
  const partes = DATA.exec(texto)
  if (!partes) return false
  const [ano, mes, dia] = partes.slice(1, 4).map(Number)
  const data = new Date(Date.UTC(ano, mes - 1, dia))
  return (
    data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia
  )
}

// Data do pagamento entre `minima` (dia da viagem) e `hoje`, ambos "AAAA-MM-DD" de São Paulo.
// Datas no mesmo formato comparam-se como texto.
export function validarDataPagamento(
  entrada: string,
  { hoje, minima }: { hoje: string; minima?: string },
): Resultado<string> {
  const texto = entrada.trim()
  if (!texto) return { ok: false, erro: 'Informe a data do pagamento.' }
  if (!dataValida(texto)) return { ok: false, erro: 'Informe uma data válida.' }
  if (texto > hoje) return { ok: false, erro: 'A data do pagamento não pode ser no futuro.' }
  if (minima && texto < minima) {
    return { ok: false, erro: 'A data do pagamento não pode ser anterior à data da viagem.' }
  }
  return { ok: true, valor: texto }
}

export function validarChavePix(entrada: string): Resultado<string> {
  const texto = entrada.trim()
  if (!texto) return { ok: false, erro: 'Informe a chave PIX.' }
  if (texto.length > CHAVE_PIX_MAX) {
    return { ok: false, erro: `A chave PIX pode ter no máximo ${CHAVE_PIX_MAX} caracteres.` }
  }
  return { ok: true, valor: texto }
}

// Só aceita voltar para a cobrança de um passageiro: evita redirecionamento aberto (FR-026).
export function caminhoVoltarSeguro(texto: string): string | null {
  const partes = /^\/pagamentos\/([^/?#]+)\/cobrar$/.exec(texto)
  return partes && ehUuid(partes[1]) ? texto : null
}

// Para onde a tela de cobrança redireciona; null = fica na cobrança (FR-015, FR-023).
export function destinoCobranca({
  chavePix,
  pendentes,
  passageiroId,
}: {
  chavePix: string | null
  pendentes: number
  passageiroId: string
}): string | null {
  if (pendentes === 0) return `/pagamentos/${passageiroId}`
  if (!chavePix) {
    const query = new URLSearchParams({
      voltar: `/pagamentos/${passageiroId}/cobrar`,
      aviso: 'pix-necessaria',
    })
    return `/pagamentos/configuracoes?${query.toString()}`
  }
  return null
}
