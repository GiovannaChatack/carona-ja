# Contrato: Server Actions, Funções SQL e Funções de Domínio

Todas as actions rodam no servidor com o cliente Supabase da sessão (`lib/supabase/server.ts`),
sob a RLS. Nenhuma usa `service_role`. As regras comuns do slice 002 continuam valendo
([acoes.md](../../002-registro-passageiros/contracts/acoes.md)):

- `id` validado com `ehUuid` antes de consultar;
- `redirect` fora do `try/catch`;
- `.bind(null, id)` para ações sobre um registro;
- `motorista_id` nunca vem do formulário.

Mensagens comuns:

| Constante | Texto |
|-----------|-------|
| `ERRO_GENERICO` | "Não foi possível salvar. Tente novamente." |
| `ERRO_TRAJETO_NAO_ENCONTRADO` | "Trajeto não encontrado." |
| `ERRO_VIAGEM_NAO_ENCONTRADA` | "Viagem não encontrada." |

## Trajetos (`app/(app)/viagens/trajetos/actions.ts`)

```ts
type CamposTrajeto = 'origem' | 'destino'
type EstadoFormularioTrajeto = {
  erro?: string
  errosCampo?: Partial<Record<CamposTrajeto, string>>
  valores?: Partial<Record<CamposTrajeto, string>>
}
type EstadoAcaoTrajeto = { erro?: string }
```

| Action | Sucesso | Falhas |
|--------|---------|--------|
| `cadastrarTrajeto(estado, formData)` | `insert`; revalida `/viagens/trajetos`; `redirect('/viagens/trajetos/<id>?aviso=cadastrado')` | validação → `errosCampo`; `23505` → `errosCampo.destino` "Este trajeto já está cadastrado."; `23514` → `errosCampo.destino` "A origem e o destino precisam ser diferentes."; outras → `ERRO_GENERICO` |
| `editarTrajeto(id, estado, formData)` | `update`; revalida `/viagens/trajetos`, `/viagens/trajetos/<id>` e `/viagens`; `redirect('…/<id>?aviso=atualizado')` | as mesmas; nenhuma linha → `ERRO_TRAJETO_NAO_ENCONTRADO` |
| `arquivarTrajeto(id, estado)` | `update arquivado_em = now()` onde `arquivado_em is null`; `redirect('…/<id>?aviso=arquivado')` | `ERRO_GENERICO` / não encontrado |
| `reativarTrajeto(id, estado)` | `update arquivado_em = null`; `redirect('…/<id>?aviso=reativado')` | `23505` → "Já existe um trajeto ativo com essa origem e esse destino."; outras → genérico |
| `excluirTrajeto(id, estado)` | `delete`; `redirect('/viagens/trajetos?aviso=excluido')` | `23503` → "Este trajeto tem viagens registradas e não pode ser excluído. Arquive-o."; outras → genérico |

## Viagens (`app/(app)/viagens/actions.ts`)

```ts
type Sentido = 'ida' | 'volta'
type CamposViagem = 'trajeto' | 'sentido' | 'data_hora' | 'passageiros'
type EstadoFormularioViagem = {
  erro?: string
  errosCampo?: Partial<Record<CamposViagem, string>>
  errosValor?: Record<string, string>           // por passageiro_id
  duplicada?: string                             // aviso que pede confirmação (CJ001)
  valores?: {                                    // o que foi preenchido, para repopular
    trajeto?: string; sentido?: string; data_hora?: string
    passageiros?: string[]; valoresPorPassageiro?: Record<string, string>
  }
}
type EstadoAcaoViagem = { erro?: string }
```

**Campos do formulário**:

- `trajeto` (uuid) e `sentido` (`ida` | `volta`);
- `data_hora` (`AAAA-MM-DDTHH:mm`, hora de São Paulo);
- `passageiros` (repetido, um uuid por passageiro marcado);
- `valor_<passageiro_id>` (texto em reais);
- `confirmar_duplicada` (`1` ou ausente).

| Action | Sucesso | Falhas |
|--------|---------|--------|
| `registrarViagem(estado, formData)` | `validarViagem`, depois `rpc('registrar_viagem', …)`; revalida `/viagens`; `redirect('/viagens?aviso=registrada')` | validação → `errosCampo`/`errosValor`; `CJ001` → `duplicada`; demais códigos na tabela abaixo; outras → `ERRO_GENERICO` |
| `editarViagem(id, estado, formData)` | `rpc('editar_viagem', …)`; revalida `/viagens` e `/viagens/<id>`; `redirect('/viagens/<id>?aviso=atualizada')` | as mesmas; `CJ006` → `ERRO_VIAGEM_NAO_ENCONTRADA` (ou arquivada) |
| `arquivarViagem(id, estado)` | `update arquivada_em = now()` onde `arquivada_em is null`; `redirect('/viagens/<id>?aviso=arquivada')` | genérico / não encontrada |
| `reativarViagem(id, estado)` | `update arquivada_em = null`; `redirect('/viagens/<id>?aviso=reativada')` | genérico / não encontrada |

Não existe action de exclusão de viagem (FR-022).

**Tradução dos erros das funções SQL** (research §8):

| Código | Destino no estado | Mensagem |
|--------|-------------------|----------|
| `CJ001` | `duplicada` | "Já existe uma viagem de <ida\|volta> neste trajeto em DD/MM/AAAA." |
| `CJ002` | `errosCampo.trajeto` | "Escolha um trajeto ativo." |
| `CJ003` | `errosCampo.passageiros` | "Um dos passageiros marcados foi arquivado ou não existe mais. Revise a lista." |
| `CJ004` | `errosCampo.passageiros` | "Marque ao menos um passageiro." |
| `CJ005` | `errosCampo.data_hora` | "A data e a hora não podem passar de 1 dia no futuro." |
| `CJ006` | `erro` | "Viagem não encontrada." |

Nos erros `CJ001`, `CJ002` e `CJ003`, a action lê o que falta para montar a mensagem (a data da
duplicada vem no `detail` do erro).

## Funções SQL (RPC)

Assinaturas, passos e códigos de erro em [data-model.md → Funções SQL](../data-model.md#funções-sql).
Chamadas:

```ts
supabase.rpc('registrar_viagem', {
  p_trajeto_id, p_sentido, p_data_hora_local: '2026-09-30T07:40',
  p_participacoes: [{ passageiro_id, valor_centavos }], p_confirmar_duplicada,
}) // → data: uuid

supabase.rpc('editar_viagem', { p_viagem_id, ...mesmos parâmetros }) // → data: null
```

## Consultas (server-only)

| Função | Arquivo | Retorno |
|--------|---------|---------|
| `listarTrajetos(situacao: 'ativos' \| 'arquivados')` | `lib/trajetos/consultas.ts` | `Trajeto[]` ordenados por origem e destino |
| `obterTrajeto(id)` (com `cache`) | idem | `(Trajeto & { quantidade_viagens: number }) \| null` |
| `listarViagens(situacao: 'ativas' \| 'arquivadas', limite)` | `lib/viagens/consultas.ts` | `{ viagens: ViagemResumo[]; temMais: boolean }` |
| `obterViagem(id)` (com `cache`) | idem | `{ viagem: ViagemResumo; participacoes: Participacao[] } \| null` |
| `obterDadosFormularioViagem(viagemId?)` | idem | `{ trajetos, passageiros, trajetoSugeridoId, viagem? }`. `passageiros` são os ativos, mais os já vinculados na edição; `trajetoSugeridoId` é o trajeto da viagem mais recente (FR-014) |

## Funções de domínio (puras, com testes unitários)

### `lib/validacao.ts` (movidas do slice 002; research §12)

```ts
type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: string }
colapsarEspacos(texto: string): string
parseValorEmCentavos(entrada: string, mensagemVazio?: string): Resultado<number>
centavosParaCampo(centavos: number): string
ehUuid(texto: string): boolean
```

`lib/passageiros/validacao.ts` reexporta as mesmas funções, sem mudança de comportamento.

### `lib/trajetos/validacao.ts`

```ts
normalizarPonto(entrada: string, rotulo: 'origem' | 'destino'): Resultado<string>
validarTrajeto(formData: FormData):
  | { ok: true; dados: { origem: string; destino: string } }
  | { ok: false; errosCampo: Partial<Record<CamposTrajeto, string>> }
rotuloTrajeto(t: { origem: string; destino: string }): string   // "Casa → Faculdade"
```

### `lib/viagens/validacao.ts`

```ts
percurso(t: { origem: string; destino: string }, sentido: Sentido): string
validarDataHoraLocal(entrada: string, agoraLocal: string): Resultado<string>
validarViagem(formData: FormData, agoraLocal: string):
  | { ok: true; dados: { trajeto_id: string; sentido: Sentido; data_hora_local: string;
                         participacoes: { passageiro_id: string; valor_centavos: number }[] } }
  | { ok: false; errosCampo: Partial<Record<CamposViagem, string>>; errosValor: Record<string, string> }
somarCentavos(valores: number[]): number
```

### `lib/format.ts`

```ts
paraCampoDataHora(valor: Date | string): string   // instante → "AAAA-MM-DDTHH:mm" em São Paulo
```

**Exemplos obrigatórios nos testes**:

| Função | Entrada | Saída |
|--------|---------|-------|
| `normalizarPonto` | `"  Casa  "` | `ok "Casa"` |
| `normalizarPonto` | `"   "` | erro "Informe a origem." / "Informe o destino." |
| `normalizarPonto` | 81 caracteres | erro "A origem deve ter até 80 caracteres." |
| `validarTrajeto` | origem `"Casa"`, destino `" casa "` | `errosCampo.destino` "A origem e o destino precisam ser diferentes." |
| `percurso` | `Casa→Faculdade`, `ida` / `volta` | `"Casa → Faculdade"` / `"Faculdade → Casa"` |
| `validarDataHoraLocal` | `"2026-09-30T07:40"`, agora `"2026-09-30T08:00"` | `ok` |
| `validarDataHoraLocal` | `"2026-10-01T08:01"`, agora `"2026-09-30T08:00"` | erro "A data e a hora não podem passar de 1 dia no futuro." |
| `validarDataHoraLocal` | `""` / `"30/09/2026"` | erro "Informe a data e a hora." / "Data e hora inválidas." |
| `validarViagem` | sem `passageiros` | `errosCampo.passageiros` "Marque ao menos um passageiro." |
| `validarViagem` | `sentido="outro"` | `errosCampo.sentido` "Escolha Ida ou Volta." |
| `validarViagem` | `valor_<id>="-1"` | `errosValor[id]` com a mensagem de faixa |
| `validarViagem` | `valor_<id>` vazio | `errosValor[id]` "Informe o valor." |
| `validarViagem` | o mesmo `passageiros` repetido | participação única (sem duplicar) |
| `somarCentavos` | `[1200, 1000, 0]` | `2200` |
| `paraCampoDataHora` | `"2026-09-30T10:40:00Z"` | `"2026-09-30T07:40"` |
