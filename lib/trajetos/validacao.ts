// Normalização e validação dos trajetos (contracts/acoes.md → "Funções de domínio").
// Funções puras, sem acesso ao banco; o banco repete as regras essenciais em checks.

import { colapsarEspacos, type Resultado } from '@/lib/validacao'

import type { CamposTrajeto } from './tipos'

const PONTO_MAX = 80

const MENSAGENS: Record<CamposTrajeto, { vazio: string; longo: string }> = {
  origem: { vazio: 'Informe a origem.', longo: 'A origem deve ter até 80 caracteres.' },
  destino: { vazio: 'Informe o destino.', longo: 'O destino deve ter até 80 caracteres.' },
}

export const ERRO_ORIGEM_IGUAL_DESTINO = 'A origem e o destino precisam ser diferentes.'

export function normalizarPonto(entrada: string, rotulo: CamposTrajeto): Resultado<string> {
  const ponto = colapsarEspacos(entrada)
  if (!ponto) return { ok: false, erro: MENSAGENS[rotulo].vazio }
  if (ponto.length > PONTO_MAX) return { ok: false, erro: MENSAGENS[rotulo].longo }
  return { ok: true, valor: ponto }
}

export function validarTrajeto(
  formData: FormData,
):
  | { ok: true; dados: { origem: string; destino: string } }
  | { ok: false; errosCampo: Partial<Record<CamposTrajeto, string>> } {
  const campo = (nome: CamposTrajeto) => String(formData.get(nome) ?? '')

  const origem = normalizarPonto(campo('origem'), 'origem')
  const destino = normalizarPonto(campo('destino'), 'destino')

  if (origem.ok && destino.ok) {
    // Igual ao check trajetos_origem_diferente_destino (lower(origem) <> lower(destino)).
    if (origem.valor.toLowerCase() === destino.valor.toLowerCase()) {
      return { ok: false, errosCampo: { destino: ERRO_ORIGEM_IGUAL_DESTINO } }
    }
    return { ok: true, dados: { origem: origem.valor, destino: destino.valor } }
  }

  const errosCampo: Partial<Record<CamposTrajeto, string>> = {}
  if (!origem.ok) errosCampo.origem = origem.erro
  if (!destino.ok) errosCampo.destino = destino.erro
  return { ok: false, errosCampo }
}

// "Casa → Faculdade"
export function rotuloTrajeto(t: { origem: string; destino: string }) {
  return `${t.origem} → ${t.destino}`
}
