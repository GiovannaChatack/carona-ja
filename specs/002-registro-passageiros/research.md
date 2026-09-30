# Pesquisa: Registro e Gestão de Passageiros

**Funcionalidade**: `specs/002-registro-passageiros` | **Data**: 2026-09-30

A stack, o layout e as convenções já foram decididos no slice 001
([research.md](../001-base-login-layout/research.md)). Este documento registra apenas as decisões
novas deste slice. Não há "NEEDS CLARIFICATION" pendente.

## 1. Nome da coluna de dono: `motorista_id`

- **Decisão**: a tabela `passageiros` usa `motorista_id uuid not null default auth.uid()`.
- **Justificativa**: o modelo acordado no slice 001
  ([data-model.md, Parte 2](../001-base-login-layout/data-model.md)) usa `motorista_id` em todas
  as tabelas de domínio, e a convenção do projeto é nomear o domínio em pt-BR (research 001 §6).
  O README, porém, mostra `usuario_id` no exemplo "Criar uma migração com RLS". A divergência é
  resolvida a favor de `motorista_id`, e o exemplo do README será corrigido neste slice para que
  os slices 003–006 não herdem a inconsistência.
- **Alternativas consideradas**: `usuario_id` (genérico, mas diverge do modelo acordado e do
  vocabulário do domínio).

## 2. Validação: módulo próprio, sem biblioteca nova

- **Decisão**: regras de validação e normalização em funções puras de TypeScript
  (`lib/passageiros/validacao.ts`), usadas pelas server actions e cobertas por testes unitários.
  O banco repete as regras essenciais com `check constraints` (defesa em profundidade).
- **Justificativa**: são 4 campos simples; uma biblioteca de esquemas (ex.: zod) seria uma
  dependência nova sem ganho proporcional (Princípio III, YAGNI). Funções puras são fáceis de
  testar com o Vitest já configurado, como pede o Fluxo de Desenvolvimento para regras de valores.
- **Alternativas consideradas**: zod (mais expressivo, mas nova dependência); validar só no
  banco (mensagens de erro ruins e sem indicação do campo, contra SC-004).

## 3. Telefone: guardar só dígitos, formatar na exibição

- **Decisão**: o telefone é normalizado para apenas dígitos e gravado como `text` com 10 ou 11
  dígitos: DDD com dois dígitos de `1` a `9` (nenhum DDD brasileiro tem zero) e, com 11 dígitos, o terceiro dígito igual a `9` (celular). A
  exibição usa um novo formatador `formatPhone` em `lib/format.ts`: `(11) 91234-5678` ou
  `(11) 3123-4567`. O link de ligação usa `tel:+55<dígitos>`.
- **Justificativa**: uma única forma canônica permite comparar, validar e formatar sem
  ambiguidade; o formatador fica junto dos demais formatadores pt-BR (contrato de UI do slice 001).
- **Alternativas consideradas**: guardar como digitado (comparações e exibição inconsistentes);
  formato E.164 com `+55` (desnecessário, pois apenas números brasileiros são aceitos).

## 4. Valor padrão: texto em reais → inteiro em centavos

- **Decisão**: o campo de valor é um `input` de texto com `inputMode="decimal"` e prefixo "R$".
  Uma função `parseValorEmCentavos` aceita `12`, `12,5`, `12,50`, `12.50` e `1.234,56`, rejeita
  mais de duas casas decimais, negativos e valores acima de `999999` centavos, e converte para
  inteiro sem ponto flutuante (divisão da string em parte inteira e decimal). O banco guarda
  `valor_padrao_centavos integer check (between 0 and 999999)`.
- **Justificativa**: Princípio V exige centavos inteiros; `input type="number"` tem comportamento
  inconsistente com vírgula decimal em navegadores pt-BR.
- **Alternativas consideradas**: `type="number"` (vírgula quebra em alguns navegadores);
  biblioteca de máscara monetária (nova dependência).

## 5. Nome único entre ativos

- **Decisão**: índice único parcial
  `unique (motorista_id, lower(nome)) where arquivado_em is null`, com o nome gravado já sem
  espaços nas pontas (garantido por `check (nome = btrim(nome))`). A server action traduz a
  violação (`23505`) para a mensagem do campo "Já existe um passageiro ativo com esse nome." O
  mesmo índice bloqueia a reativação de um arquivado cujo nome colida (US4, cenário 3).
- **Justificativa**: a regra fica garantida pelo banco mesmo com duas abas ou cliques duplos;
  consultar antes de inserir teria condição de corrida.
- **Alternativas consideradas**: verificação só na aplicação (condição de corrida);
  `citext` (extensão a mais só para isso).

## 6. Busca e filtro: filtro por situação no servidor, busca no cliente

- **Decisão**: a página `/passageiros` lê `?situacao=arquivados` (padrão: ativos) e carrega do
  banco todos os passageiros dessa situação, ordenados por nome. A busca por nome é feita no
  cliente, enquanto se digita, ignorando maiúsculas/minúsculas e acentos (normalização NFD), e é
  espelhada em `?busca=` com `router.replace` para que o botão "Voltar" dos detalhes retorne à
  mesma busca e filtro (US2, cenário 4).
- **Justificativa**: o volume é pequeno (dezenas, no máximo poucas centenas de passageiros de um
  motorista); filtrar no cliente dá resposta instantânea (SC-002) sem idas ao servidor a cada
  tecla, e a URL preserva o estado.
- **Alternativas consideradas**: busca no servidor com `ilike` a cada tecla (latência e
  complexidade de debounce); paginação (desnecessária para o volume).

## 7. Mutações: server actions com `useActionState`

- **Decisão**: cadastrar, editar, arquivar, reativar e excluir são server actions em
  `app/(app)/passageiros/actions.ts`, no mesmo padrão de `app/(publico)/entrar/actions.ts`:
  - retornam `{ erro?, errosCampo?, valores? }` em caso de falha;
  - em caso de sucesso chamam `revalidatePath('/passageiros')` e `redirect` para a tela de
    destino com `?aviso=<tipo>`, lido por um componente cliente que mostra o toast e limpa a URL
    (mesmo padrão de `aviso-senha-atualizada.tsx`, generalizado em `components/aviso-url.tsx`).
  - O botão de envio fica desabilitado enquanto `pending` (evita cadastro duplicado por clique
    duplo).
- **Formulário não perde o que foi digitado**: no React 19, formulários com `action` são
  resetados após o envio. Por isso a action devolve os `valores` enviados e os campos usam
  `defaultValue={estado.valores?.campo ?? inicial}`.
- **Justificativa**: segue o guia de mutações do Next 16 (`node_modules/next/dist/docs/01-app/
  01-getting-started/07-mutating-data.md`) e o padrão já existente; nenhuma rota de API extra.
- **Alternativas consideradas**: chamadas diretas ao Supabase pelo cliente (mais código de
  estado no cliente e validação duplicada); route handlers (mais código sem ganho).

## 8. Rotas e parâmetros dinâmicos

- **Decisão**: `/passageiros`, `/passageiros/novo`, `/passageiros/[id]` e
  `/passageiros/[id]/editar`. Em Next 16, `params` e `searchParams` são `Promise` e devem ser
  aguardados. Um `id` que não é UUID válido chama `notFound()` antes de consultar o banco (evita
  o erro `22P02` do Postgres). Um `id` de outra conta não é retornado por causa da RLS e também
  resulta em `notFound()` (US2, cenário 5).
- **Justificativa**: URLs em pt-BR (research 001 §6); telas separadas para detalhes e edição
  funcionam bem no celular e permitem voltar com o botão do navegador.
- **Alternativas consideradas**: edição em diálogo sobre a lista (formulário apertado no celular
  e sem URL própria).

## 9. Exclusão bloqueada quando houver viagens

- **Decisão**: neste slice ainda não existe a tabela de participações, então a exclusão sempre é
  permitida após confirmação. O slice 003 criará `viagem_passageiros.passageiro_id` com
  `on delete restrict`; a action de excluir já trata o erro de chave estrangeira (`23503`) com a
  mensagem "Este passageiro tem viagens registradas e não pode ser excluído. Arquive-o." Assim o
  bloqueio passa a valer automaticamente quando as viagens existirem, sem alterar este slice.
- **Justificativa**: cumpre FR-016 e o Princípio II (não criar tabela de outro slice) ao mesmo
  tempo.
- **Alternativas consideradas**: criar agora uma tabela vazia de viagens (viola o Princípio II);
  contar participações antes de excluir (condição de corrida; o banco já garante).

## 10. Testes

- **Decisão**:
  - **Unitários (Vitest)**: `normalizarTelefone`/validação de telefone, `parseValorEmCentavos`,
    validação de nome e observação, `formatPhone` e a normalização da busca.
  - **Ponta a ponta (Playwright, projetos `mobile` e `desktop`)**: `tests/e2e/passageiros.spec.ts`
    com a conta de teste (`E2E_EMAIL`/`E2E_SENHA`), cobrindo cadastro, validação, duplicidade,
    busca, detalhes, edição, arquivar/reativar e excluir. Cada teste usa nomes com sufixo único e
    exclui o que criou, para não acumular dados na conta de teste.
  - **RLS**: verificação manual com uma segunda conta, descrita no [quickstart](./quickstart.md).
- **Justificativa**: o Fluxo de Desenvolvimento exige testes automatizados para regras de valores
  e verificação em larguras de celular e desktop.
