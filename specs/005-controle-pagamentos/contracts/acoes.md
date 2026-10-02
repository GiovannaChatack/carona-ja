# Contrato: Server Actions, Consultas e Funções de Domínio

Todas as server actions chamam `obterUsuarioLogado()` primeiro e usam o cliente Supabase da
sessão (RLS). Os componentes cliente as envolvem com `tratarFalhaDeConexao` (FR-028). Ids
recebidos são conferidos com `ehUuid`; ids inválidos ou de outra conta simplesmente não casam com
nenhuma linha.

## Pagamentos (`app/(app)/pagamentos/actions.ts`)

```ts
type EstadoPagamento = {
  erro?: string                 // erro geral (conexão, CJ009, falha inesperada)
  erroData?: string             // erro no campo de data (validação ou CJ008)
  sucesso?: string              // texto do toast quando a tela não redireciona
}
```

| Action | Entrada | Efeito | Retorno |
|--------|---------|--------|---------|
| `marcarPagamentos(passageiroId, estado, formData)` | `formData`: `participacao` (vários ids), `data` (`AAAA-MM-DD`) | valida a data (`validarDataPagamento`); `update viagem_passageiros set pago_em where id in ids and passageiro_id = passageiroId and pago_em is null` com `.select('id')`; `revalidatePath` de `/pagamentos`, `/pagamentos/[id]`, `/passageiros/[id]` | `{ sucesso: 'N viagens marcadas como pagas' }` (+ " · M já estavam pagas") ou erro |
| `receberTudo(passageiroId, estado, formData)` | `formData`: `data` | busca **no servidor** os ids pendentes do passageiro em `participacoes_detalhe` (`pago_em is null`, `valor_centavos > 0`, `arquivada_em is null`) e aplica o mesmo `update` | idem |
| `desfazerPagamento(participacaoId, passageiroId)` | — | `set pago_em = null where id = :id and pago_em is not null` | `{ sucesso: 'Pagamento desfeito' }` ou erro |
| `alterarDataPagamento(participacaoId, passageiroId, estado, formData)` | `formData`: `data` | valida; `set pago_em = :data where id = :id and pago_em is not null` | `{ sucesso: 'Data do pagamento alterada' }` ou erro |
| `marcarPagamentoNaViagem(viagemId, participacaoId, estado, formData)` (fatia C) | `formData`: `data` | igual a `marcarPagamentos` com um id; revalida também `/viagens/[id]` | `{ sucesso: 'Pagamento registrado' }` ou erro |

Mapeamento de erros do banco: `CJ008` → `erroData` com o texto de
[data-model.md](../data-model.md#erros-novos); `CJ009` → `erro`; nenhuma linha alterada em
`desfazer`/`alterarData` → `erro: 'Este pagamento já foi alterado. Atualize a página.'`; demais →
`erro: 'Não foi possível salvar. Tente novamente.'`.

## Chave PIX (`app/(app)/pagamentos/configuracoes/actions.ts`, fatia B)

```ts
type EstadoChavePix = { erro?: string; erroCampo?: string; valor?: string }
```

| Action | Entrada | Efeito |
|--------|---------|--------|
| `salvarChavePix(estado, formData)` | `chave_pix`, `voltar` | `validarChavePix`; `update perfis set chave_pix where id = auth.uid()`; `redirect(voltarSeguro ?? '/pagamentos')` com `?aviso=pix-salva` |

`voltarSeguro`: aceito apenas se casar com `^/pagamentos/<uuid>/cobrar$`; qualquer outro valor é
descartado.

## Viagens (ajustes em `app/(app)/viagens/actions.ts`, fatia A)

- `erroDaFuncao` ganha `CJ007` → `errosCampo.passageiros = '{detail} já pagou esta viagem. Desfaça
  o pagamento antes de alterar o valor ou removê-lo.'`.
- `arquivarViagem` não muda: a confirmação reforçada é só no diálogo (research §5).

## Funções SQL e trigger

| Objeto | Descrição |
|--------|-----------|
| `public.validar_pagamento()` + trigger `viagem_passageiros_validar_pagamento` | regras de pagamento; erros `CJ007`–`CJ009` ([data-model.md](../data-model.md)) |
| `public.editar_viagem(...)` | redefinida com o bloqueio `CJ007` para participações pagas |

Nenhuma RPC nova: marcar, desfazer e corrigir usam `update` pela API (research §2 e §3).

## Consultas (server-only, `lib/pagamentos/consultas.ts`)

| Função | Fonte | Retorno |
|--------|-------|---------|
| `listarPendencias()` | `pendencias_passageiros` | `{ pendencias: PendenciaPassageiro[]; totalCentavos: number }`, ordenado por total desc, nome |
| `obterPagamentosPassageiro(id, limitePagas)` | `passageiros` + `participacoes_detalhe` (`arquivada_em is null`) | `{ passageiro; pendentes: ParticipacaoDetalhe[]; pagas: ParticipacaoDetalhe[]; temMaisPagas: boolean; totalDevidoCentavos }` ou `null`; pendentes exclui `valor_centavos = 0` |
| `obterTotalDevido(passageiroId)` | `pendencias_passageiros` | `number` (0 sem linha) |
| `obterDadosCobranca(passageiroId)` | `passageiros`, `participacoes_detalhe`, `perfis` | `{ nome; telefone; chavePix: string \| null; itens: (ItemCobranca & { id })[] }` ou `null` |
| `obterChavePix()` | `perfis` | `string \| null` |

`obterViagem` (slice 003, `lib/viagens/consultas.ts`) passa a selecionar também `pago_em`.
`obterDadosFormularioViagem` passa a devolver `pagos: Record<passageiro_id, pago_em>` na edição.

## Funções de domínio (puras, com testes unitários)

### `lib/pagamentos/mensagem.ts`

| Função | Contrato | Exemplos obrigatórios |
|--------|----------|-----------------------|
| `primeiroNome(nome)` | primeira palavra após colapsar espaços | `'Duda'` → `'Duda'`; `'  Maria   Eduarda Silva '` → `'Maria'` |
| `montarMensagemCobranca({ nome, chavePix, itens })` | texto do modelo da spec; itens em ordem de `realizada_em`; total em centavos; `R$` com espaço comum | o exemplo da spec (Duda, 2 × R$ 10,00 em 28/09/2026, Ida e Volta) igual caractere a caractere; R$ 1.234,56 com separador de milhar; 23:30 de 30/09 em São Paulo sai como `30/09/2026` |
| `linkWhatsApp(telefone, texto)` | `https://wa.me/55{dígitos}?text={encodeURIComponent(texto)}` | `'11912345678'` → começa com `https://wa.me/5511912345678?text=`; `\n` → `%0A`; `*` mantido ou codificado de forma que `decodeURIComponent` devolva o texto original |
| `totalItens(itens)` | soma inteira de `valor_centavos` | `[]` → `0` |

### `lib/pagamentos/validacao.ts`

| Função | Contrato | Exemplos obrigatórios |
|--------|----------|-----------------------|
| `validarDataPagamento(texto, { hoje, minima? })` | `Resultado<string>`; aceita `AAAA-MM-DD` válido, `minima <= data <= hoje` | vazio → "Informe a data do pagamento."; `2026-02-30` → inválida; amanhã → "não pode ser no futuro"; antes de `minima` → "não pode ser anterior à data da viagem"; hoje → ok |
| `validarChavePix(texto)` | `Resultado<string>` aparada; 1–77 caracteres | `''`/`'   '` → "Informe a chave PIX."; 78 caracteres → erro de tamanho; `' teste@exemplo.com '` → `'teste@exemplo.com'` |
| `caminhoVoltarSeguro(texto)` | `string \| null`; só `/pagamentos/<uuid>/cobrar` | `'https://x.com'` → `null`; `'//x.com'` → `null` |

### `lib/format.ts` (`hojeEmSaoPaulo` já existe desde o slice 004 e é só reutilizada)

| Função | Contrato | Exemplos obrigatórios |
|--------|----------|-----------------------|
| `formatDataCampo('AAAA-MM-DD')` | `DD/MM/AAAA`, sem conversão de fuso (é um `date`) | `'2026-09-28'` → `'28/09/2026'` |
