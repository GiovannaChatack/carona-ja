// Mensagem de cobrança e link do WhatsApp (research §8 e §9).
// Funções puras, usadas no cliente (prévia) e nos testes.

import { formatCurrency, formatDate } from '@/lib/format'
import { colapsarEspacos } from '@/lib/validacao'

import type { ItemCobranca } from './tipos'

export function primeiroNome(nome: string) {
  return colapsarEspacos(nome).split(' ')[0]
}

export function totalItens(itens: { valor_centavos: number }[]) {
  return itens.reduce((total, item) => total + item.valor_centavos, 0)
}

// O Intl separa "R$" do número com espaço não separável; na mensagem, espaço comum (SC-006).
function reais(centavos: number) {
  return formatCurrency(centavos).replace(/[\u00a0\u202f]/g, ' ')
}

// Texto do modelo da spec (FR-017): itens em ordem cronológica e total somado em centavos.
export function montarMensagemCobranca({
  nome,
  chavePix,
  itens,
}: {
  nome: string
  chavePix: string
  itens: ItemCobranca[]
}) {
  const total = reais(totalItens(itens))
  const linhas = [...itens]
    .sort((a, b) => new Date(a.realizada_em).getTime() - new Date(b.realizada_em).getTime())
    .map(
      (item) =>
        `- ${formatDate(item.realizada_em)} (${item.sentido === 'ida' ? 'Ida' : 'Volta'}): ${reais(item.valor_centavos)}`,
    )

  return [
    `Olá, ${primeiroNome(nome)}!`,
    '',
    `Segue o detalhamento das suas viagens pendentes (Total Devido: ${total}):`,
    '',
    ...linhas,
    '',
    `*Valor a ser pago: ${total}*`,
    '',
    'Você pode pagar via PIX para a chave:',
    `*${chavePix}*`,
    '',
    'Qualquer dúvida, estou à disposição. Obrigado!',
  ].join('\n')
}

// "Click to chat": o telefone é gravado só com dígitos e com DDD (slice 002).
export function linkWhatsApp(telefone: string, texto: string) {
  return `https://wa.me/55${telefone.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`
}
