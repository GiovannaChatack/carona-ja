# Contrato: Server Actions e Funções de Domínio

## Server actions (`app/(app)/passageiros/actions.ts`)

Todas rodam no servidor com o cliente Supabase da sessão (`lib/supabase/server.ts`); a RLS
garante que só os passageiros do motorista logado são lidos ou alterados. Nenhuma usa a chave
`service_role`.

```ts
type CamposPassageiro = 'nome' | 'telefone' | 'valor' | 'observacao'

type EstadoFormularioPassageiro = {
  erro?: string                                       // erro geral (ex.: conexão)
  errosCampo?: Partial<Record<CamposPassageiro, string>>
  valores?: Partial<Record<CamposPassageiro, string>> // o que foi digitado, para repopular
}

type EstadoAcaoPassageiro = { erro?: string }
```

| Action | Entrada | Sucesso | Falhas |
|--------|---------|---------|--------|
| `cadastrarPassageiro(estado, formData)` | `nome`, `telefone`, `valor`, `observacao` | `insert`; `revalidatePath('/passageiros')`; `redirect('/passageiros/<id>?aviso=cadastrado')` | validação → `errosCampo` + `valores`; `23505` → `errosCampo.nome` "Já existe um passageiro ativo com esse nome."; outras → `erro` "Não foi possível salvar. Tente novamente." |
| `editarPassageiro(id, estado, formData)` | mesmos campos (`id` ligado com `.bind`) | `update`; revalida; `redirect('/passageiros/<id>?aviso=atualizado')` | iguais às do cadastro; nenhuma linha atualizada → `erro` "Passageiro não encontrado." |
| `arquivarPassageiro(id, estado)` | — | `update arquivado_em = now()` onde `arquivado_em is null`; revalida; `redirect('/passageiros/<id>?aviso=arquivado')` | `erro` genérico |
| `reativarPassageiro(id, estado)` | — | `update arquivado_em = null`; revalida; `redirect('/passageiros/<id>?aviso=reativado')` | `23505` → `erro` "Já existe um passageiro ativo com esse nome. Renomeie um deles antes de reativar."; outras → `erro` genérico |
| `excluirPassageiro(id, estado)` | — | `delete`; revalida; `redirect('/passageiros?aviso=excluido')` | `23503` → `erro` "Este passageiro tem viagens registradas e não pode ser excluído. Arquive-o."; outras → `erro` genérico |

Regras comuns:

- O `id` é validado como UUID antes de qualquer consulta; inválido → `erro` "Passageiro não
  encontrado.".
- `redirect` é chamado fora do `try/catch` (ele lança uma exceção de controle do Next).
- As actions de arquivar, reativar e excluir recebem o `id` por `.bind(null, id)` e seguem a
  assinatura de `useActionState`: `(id, estado: EstadoAcaoPassageiro) => Promise<EstadoAcaoPassageiro>`.
- `motorista_id` nunca vem do formulário: o banco preenche com `default auth.uid()` e a RLS
  confere em `with check`.

## Funções de domínio (`lib/passageiros/validacao.ts`)

Funções puras, sem acesso ao banco, cobertas por testes unitários.

```ts
type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: string }

normalizarNome(entrada: string): Resultado<string>
normalizarTelefone(entrada: string): Resultado<string>          // só dígitos, 10 ou 11
parseValorEmCentavos(entrada: string): Resultado<number>        // inteiro 0..999999
normalizarObservacao(entrada: string): Resultado<string | null>

validarPassageiro(formData: FormData): 
  | { ok: true; dados: { nome: string; telefone: string; valor_padrao_centavos: number; observacao: string | null } }
  | { ok: false; errosCampo: Partial<Record<CamposPassageiro, string>> }

normalizarParaBusca(texto: string): string  // minúsculas, sem acentos, espaços colapsados
centavosParaCampo(centavos: number): string  // 1250 → "12,50" (valor inicial do campo de edição)
ehUuid(texto: string): boolean
```

Exemplos obrigatórios nos testes:

| Função | Entrada | Saída |
|--------|---------|-------|
| `parseValorEmCentavos` | `"12"` / `"12,5"` / `"12,50"` / `"12.50"` / `"1.234,56"` / `"0"` | `1200` / `1250` / `1250` / `1250` / `123456` / `0` |
| `parseValorEmCentavos` | `""` / `"-1"` / `"12,345"` / `"10000"` / `"abc"` | erro |
| `normalizarTelefone` | `"(11) 91234-5678"` / `"11 3123 4567"` / `"+55 11 91234-5678"` | `"11912345678"` / `"1131234567"` / `"11912345678"` |
| `normalizarTelefone` | `""` / `"91234-5678"` / `"(01) 91234-5678"` / `"11812345678"` | erro |
| `normalizarNome` | `"  Ana   Paula "` | `"Ana Paula"` |
| `normalizarObservacao` | `"   "` | `null` |
| `normalizarParaBusca` | `"  JOSÉ  da Silva"` | `"jose da silva"` |

## Formatador novo (`lib/format.ts`)

| Função | Entrada | Saída |
|--------|---------|-------|
| `formatPhone(digitos: string)` | `"11912345678"` / `"1131234567"` | `"(11) 91234-5678"` / `"(11) 3123-4567"` |

Entrada fora do formato canônico é devolvida sem alteração (a exibição nunca quebra).
