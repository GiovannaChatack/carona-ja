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

// en-CA dá as partes numéricas; h23 evita "24" à meia-noite.
const campoDataHora = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

type Instante = Date | string

function paraDate(valor: Instante) {
  return typeof valor === 'string' ? new Date(valor) : valor
}

export function formatCurrency(centavos: number) {
  if (!Number.isInteger(centavos)) throw new Error('Valor em centavos deve ser inteiro')
  return moeda.format(centavos / 100)
}

// Telefone gravado só com dígitos: 11 → "(DD) 9XXXX-XXXX"; 10 → "(DD) XXXX-XXXX".
// Qualquer outra entrada volta sem alteração, para a exibição nunca quebrar.
export function formatPhone(digitos: string) {
  const partes = /^(\d{2})(\d{5})(\d{4})$/.exec(digitos) ?? /^(\d{2})(\d{4})(\d{4})$/.exec(digitos)
  if (!partes) return digitos
  return `(${partes[1]}) ${partes[2]}-${partes[3]}`
}

export function formatDate(valor: Instante) {
  return data.format(paraDate(valor))
}

// Data de calendário "AAAA-MM-DD" (coluna date) → "DD/MM/AAAA", sem conversão de fuso.
export function formatDataCampo(data: string) {
  return `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}`
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

// Instante → "AAAA-MM-DDTHH:mm" em São Paulo, o formato do <input type="datetime-local">.
export function paraCampoDataHora(valor: Instante) {
  const partes = Object.fromEntries(
    campoDataHora.formatToParts(paraDate(valor)).map(({ type, value }) => [type, value]),
  )
  return `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}`
}

// Data de hoje em São Paulo, "AAAA-MM-DD", independentemente do fuso do servidor.
export function hojeEmSaoPaulo(agora: Date = new Date()) {
  return paraCampoDataHora(agora).slice(0, 10)
}
