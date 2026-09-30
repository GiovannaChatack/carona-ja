// Validação das viagens (contracts/acoes.md → "Funções de domínio").
// Funções puras, sem acesso ao banco; a função SQL registrar_viagem repete as regras essenciais.

import { rotuloTrajeto } from '@/lib/trajetos/validacao'
import { ehUuid, parseValorEmCentavos, type Resultado } from '@/lib/validacao'

import type { CamposViagem, Sentido } from './tipos'

const DATA_HORA = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/

const UM_DIA_MS = 24 * 60 * 60 * 1000

// Percurso no sentido da viagem: ida = origem → destino; volta = destino → origem (FR-009).
export function percurso(t: { origem: string; destino: string }, sentido: Sentido) {
  return sentido === 'ida' ? rotuloTrajeto(t) : `${t.destino} → ${t.origem}`
}

// "AAAA-MM-DDTHH:mm" → milissegundos, tratando o texto como UTC só para fazer contas.
// Devolve null se a data não existir (ex.: 30/02).
function paraMs(texto: string) {
  const partes = DATA_HORA.exec(texto)
  if (!partes) return null
  const [ano, mes, dia, hora, minuto] = partes.slice(1, 6).map(Number)
  const ms = Date.UTC(ano, mes - 1, dia, hora, minuto)
  const data = new Date(ms)
  const confere =
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia &&
    data.getUTCHours() === hora &&
    data.getUTCMinutes() === minuto
  return confere ? ms : null
}

function paraTexto(ms: number) {
  return new Date(ms).toISOString().slice(0, 16)
}

// Data e hora de São Paulo, no máximo 1 dia depois de `agoraLocal` (FR-011).
// Os dois lados estão no mesmo fuso, então basta comparar os textos "AAAA-MM-DDTHH:mm".
export function validarDataHoraLocal(entrada: string, agoraLocal: string): Resultado<string> {
  const texto = entrada.trim()
  if (!texto) return { ok: false, erro: 'Informe a data e a hora.' }

  const ms = paraMs(texto)
  if (ms === null) return { ok: false, erro: 'Data e hora inválidas.' }
  const valor = paraTexto(ms)

  const agora = paraMs(agoraLocal)
  if (agora !== null && valor > paraTexto(agora + UM_DIA_MS)) {
    return { ok: false, erro: 'A data e a hora não podem passar de 1 dia no futuro.' }
  }
  return { ok: true, valor }
}

export function validarViagem(
  formData: FormData,
  agoraLocal: string,
):
  | {
      ok: true
      dados: {
        trajeto_id: string
        sentido: Sentido
        data_hora_local: string
        participacoes: { passageiro_id: string; valor_centavos: number }[]
      }
    }
  | {
      ok: false
      errosCampo: Partial<Record<CamposViagem, string>>
      errosValor: Record<string, string>
    } {
  const campo = (nome: string) => String(formData.get(nome) ?? '')
  const errosCampo: Partial<Record<CamposViagem, string>> = {}
  const errosValor: Record<string, string> = {}

  const trajeto = campo('trajeto')
  if (!ehUuid(trajeto)) errosCampo.trajeto = 'Escolha um trajeto.'

  const sentido = campo('sentido')
  if (sentido !== 'ida' && sentido !== 'volta') errosCampo.sentido = 'Escolha Ida ou Volta.'

  const dataHora = validarDataHoraLocal(campo('data_hora'), agoraLocal)
  if (!dataHora.ok) errosCampo.data_hora = dataHora.erro

  // Sem repetições e só UUIDs.
  const ids = [...new Set(formData.getAll('passageiros').map(String))].filter(ehUuid)
  if (ids.length === 0) errosCampo.passageiros = 'Marque ao menos um passageiro.'

  const participacoes: { passageiro_id: string; valor_centavos: number }[] = []
  for (const id of ids) {
    const valor = parseValorEmCentavos(campo(`valor_${id}`), 'Informe o valor.')
    if (valor.ok) participacoes.push({ passageiro_id: id, valor_centavos: valor.valor })
    else errosValor[id] = valor.erro
  }

  if (!dataHora.ok || Object.keys(errosCampo).length > 0 || Object.keys(errosValor).length > 0) {
    return { ok: false, errosCampo, errosValor }
  }

  return {
    ok: true,
    dados: {
      trajeto_id: trajeto,
      sentido: sentido as Sentido,
      data_hora_local: dataHora.valor,
      participacoes,
    },
  }
}

export function somarCentavos(valores: number[]) {
  return valores.reduce((total, valor) => total + valor, 0)
}
