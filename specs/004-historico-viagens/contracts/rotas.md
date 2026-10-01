# Contrato: Telas e Navegação do Histórico

**Funcionalidade**: `specs/004-historico-viagens`

## Rotas

| Rota | Tipo | Descrição |
|------|------|-----------|
| `/historico` | nova, protegida | tela de histórico com filtros, resumo e tabela |
| `/viagens/[id]` | existente (slice 003) | aceita `volta=historico` para o link "voltar" |
| `/passageiros/[id]` | existente (slice 002) | ganha o botão "Ver histórico" |

A proteção por sessão continua no `proxy.ts` (nenhuma alteração) e a página chama
`obterUsuarioLogado()` como defesa em profundidade.

## `/historico`

### Query string

`periodo`, `inicio`, `fim`, `passageiro`, `trajeto`, `sentido`, `pagina` — semântica e padrões em
[../data-model.md](../data-model.md#filtro-do-histórico-filtrohistorico). Exemplos:

- `/historico` → este mês, sem filtros;
- `/historico?periodo=mes-passado&passageiro=<uuid>`;
- `/historico?periodo=personalizado&inicio=2026-09-01&fim=2026-09-15&sentido=volta`.

### Estrutura da tela (de cima para baixo)

1. **Título** "Histórico" (`<h1>`).
2. **Filtros** (`FiltrosHistorico`, cliente):
   - "Período": Este mês · Mês passado · Últimos 30 dias · Personalizado;
   - no personalizado: "De" e "Até" (`type="date"`) + botão "Aplicar";
   - "Passageiro": Todos · nomes (arquivados com " (arquivado)");
   - "Trajeto": Todos · "Origem → Destino" (arquivados com " (arquivado)");
   - "Sentido": Ida e volta · Ida · Volta;
   - link "Limpar filtros" (visível só com algum filtro diferente do padrão).

   No celular os campos ficam empilhados em largura total; a partir de 768px, em grade. Todos com
   altura ≥ 44px e `<label>` associado.
3. **Resumo** (cartão): período por extenso ("01/10/2026 a 31/10/2026"), "N viagens" (singular
   "1 viagem") e "Total cobrado: R$ X" — com passageiro: "Total cobrado de {nome}: R$ X".
4. **Aviso** (quando aplicável): "Período inválido; mostrando este mês."
5. **Tabela** (`ResponsiveTable`): colunas Data (link, `DD/MM/AAAA HH:mm`), Percurso (no sentido
   da viagem), Sentido (badge Ida/Volta), Passageiros (nomes separados por vírgula), Total; com
   passageiro filtrado, coluna extra "Valor de {nome}". Todas essenciais (aparecem nos cartões).
6. **"Carregar mais"** quando houver mais linhas (`?pagina=N+1`, `scroll={false}`).

### Estados vazios (FR-017)

| Situação | Título | Descrição | Ação |
|----------|--------|-----------|------|
| Nenhuma viagem ativa registrada | "Nenhuma viagem registrada" | "As viagens que você registrar aparecem aqui, com filtros por período e passageiro." | "Nova viagem" → `/viagens/nova` |
| Viagens existem, mas nenhuma no filtro | "Nenhuma viagem no período" | "Não há viagens com os filtros escolhidos." | "Limpar filtros" → `/historico` (só se houver filtro além do padrão) |

O resumo continua visível com "0 viagens" e "R$ 0,00" no segundo caso.

### Erros (FR-022)

Falha nas consultas é lançada e tratada por `app/(app)/error.tsx` (padrão existente), que já
oferece "Tentar novamente"; como os filtros estão na URL, tentar de novo os preserva. A mensagem
específica "Não foi possível carregar o histórico. Tente novamente." vem de um `error.tsx` próprio
em `app/(app)/historico/` que reutiliza `components/erro-conexao.tsx`; o componente ganha a prop opcional `mensagem` (padrão: o texto atual), sem mudar os usos existentes.

### Metadados

`title: 'Histórico · Caronas Já'`.

## Navegação

`components/layout/nav-items.ts`: novo item `Histórico` (`/historico`, ícone `History` do
`lucide-react`) logo após "Viagens". Ativo em `/historico` (regra `itemAtivo` existente).

## Detalhes da viagem: voltar ao histórico

- O link de cada linha: `/viagens/{id}?volta=historico&de=<query atual do histórico, codificada>`.
- Em `/viagens/[id]`, `hrefDeVolta(de, volta)`:
  - `volta === 'historico'` → `/historico?` + `paraQuery(lerFiltros(de))` (só chaves conhecidas)
    e rótulo do link "Histórico";
  - qualquer outro caso → comportamento atual (`/viagens…`, rótulo "Viagens").
- As ações da viagem (editar, arquivar) continuam com o comportamento atual.

## Detalhes do passageiro: atalho

Botão secundário "Ver histórico" (ícone `History`) na área de ações de `/passageiros/[id]`, para
`/historico?passageiro={id}`. Aparece para passageiros ativos e arquivados.
