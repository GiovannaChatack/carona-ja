// Formatadores pt-BR usados em toda a interface (contracts/ui.md → "Formatadores").
// Valores em dinheiro chegam em centavos inteiros; datas são exibidas no fuso de São Paulo.

export const TIME_ZONE = 'America/Sao_Paulo'

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const data = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const hora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const mes = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TIME_ZONE,
  month: 'long',
  year: 'numeric',
})

type Instante = Date | string

function paraDate(valor: Instante) {
  return typeof valor === 'string' ? new Date(valor) : valor
}

export function formatCurrency(centavos: number) {
  if (!Number.isInteger(centavos)) throw new Error('Valor em centavos deve ser inteiro')
  return moeda.format(centavos / 100)
}

export function formatDate(valor: Instante) {
  return data.format(paraDate(valor))
}

export function formatTime(valor: Instante) {
  return hora.format(paraDate(valor))
}

export function formatDateTime(valor: Instante) {
  return `${formatDate(valor)} ${formatTime(valor)}`
}

export function formatMonth(valor: Instante) {
  return mes.format(paraDate(valor))
}
