# Caronas Já

Sistema pessoal para o motorista controlar suas caronas: passageiros, viagens, pagamentos e um
resumo mensal. Funciona no celular e no computador.

- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui, hospedado na Vercel.
- **Banco, autenticação e API**: Supabase (Postgres com RLS e Supabase Auth).
- **Custo**: planos gratuitos da Vercel e do Supabase.

A documentação de cada funcionalidade fica em [`specs/`](./specs/). O slice atual é o
[001 — Base do projeto](./specs/001-base-login-layout/spec.md).

## Pré-requisitos

- Node.js 20 LTS ou superior (com npm).
- Conta no [GitHub](https://github.com), na [Vercel](https://vercel.com) e no
  [Supabase](https://supabase.com), todas no plano gratuito.
- Opcional: Docker, apenas se quiser rodar o Supabase localmente (`npx supabase start`).

A Supabase CLI já vem como dependência de desenvolvimento; use-a sempre via `npx supabase ...`.

## 1. Criar o projeto no Supabase

1. No [painel do Supabase](https://supabase.com/dashboard), crie um novo projeto.
   - **Região**: South America (São Paulo) — `sa-east-1`.
   - Guarde a senha do banco em um gerenciador de senhas (ela não vai para o repositório).
2. Em **Project Settings → API**, copie a **Project URL** e a chave pública **anon/publishable**.
3. Anote o **Project ref** (o identificador que aparece na URL do painel).

## 2. Configurar o ambiente local

```bash
npm install
```

```bash
cp .env.example .env.local
```

Preencha o `.env.local`:

| Variável                        | Valor                   |
| ------------------------------- | ----------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Project URL do Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon/publishable  |
| `NEXT_PUBLIC_SITE_URL`          | `http://localhost:3000` |

> **Nunca** coloque a `service_role` key (ou qualquer chave secreta) no `.env.local`, no código
> ou na Vercel. O `.env.local` é ignorado pelo git.

Vincule o repositório ao projeto e aplique as migrações do banco:

```bash
npx supabase login
```

```bash
npx supabase link --project-ref <ref-do-projeto>
```

```bash
npx supabase db push
```

## 3. Configurar a autenticação no Supabase

Detalhes em [`contracts/ambiente.md`](./specs/001-base-login-layout/contracts/ambiente.md).

| Local no painel                                    | Configuração                                                                                                                                 |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication → Sign In / Providers → Email       | Provedor habilitado; **desligar** "Allow new users to sign up"                                                                               |
| Authentication → URL Configuration → Site URL      | URL de produção (a mesma de `NEXT_PUBLIC_SITE_URL` na Vercel)                                                                                |
| Authentication → URL Configuration → Redirect URLs | `<url-produção>/**`, `http://localhost:3000/**` e o padrão de previews da Vercel (ex.: `https://carona-ja-*-giovanna-chatack.vercel.app/**`) |
| Authentication → Email Templates → Reset Password  | Texto em pt-BR, com o link `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=recovery&next=/redefinir-senha`                   |
| Authentication → Users → Add user                  | Criar a conta do dono (e-mail e senha), marcada como confirmada                                                                              |

Não existe cadastro público: a única forma de criar uma conta é pelo painel do Supabase.

## 4. Publicar na Vercel

1. Crie um repositório no GitHub e envie o código (`git push -u origin main`).
2. Na [Vercel](https://vercel.com/new), importe o repositório.
   - **Framework**: Next.js (detectado automaticamente).
   - **Branch de produção**: `main`.
3. Em **Settings → Environment Variables**, cadastre as três variáveis do `.env.example` nos
   ambientes **Production** e **Preview**. Em `NEXT_PUBLIC_SITE_URL`, use a URL de produção
   (ex.: `https://carona-ja-theta.vercel.app`).
4. Faça o deploy. Depois de trocar variáveis, é preciso fazer um novo deploy (**Deployments →
   Redeploy**) para que elas tenham efeito.
5. Volte ao Supabase e preencha a **Site URL** e as **Redirect URLs** com a URL de produção
   (passo 3).

A partir daí, cada push na `main` publica automaticamente em produção, e cada branch ou pull
request ganha uma URL de preview.

## 5. Rodar e testar

```bash
npm run dev
```

Abra <http://localhost:3000>.

| Comando             | O que faz                                                                            |
| ------------------- | ------------------------------------------------------------------------------------ |
| `npm run lint`      | ESLint                                                                               |
| `npm run typecheck` | Verificação de tipos do TypeScript                                                   |
| `npm run format`    | Formata o código com o Prettier                                                      |
| `npm run test`      | Testes unitários (Vitest)                                                            |
| `npm run test:e2e`  | Testes ponta a ponta (Playwright), em larguras de celular (360px) e desktop (1280px) |

Antes do primeiro `npm run test:e2e`, instale o navegador do Playwright:

```bash
npx playwright install chromium
```

Para rodar os testes ponta a ponta contra a produção, defina `E2E_BASE_URL` (no PowerShell,
`$env:E2E_BASE_URL = "https://<url-produção>"`):

```bash
E2E_BASE_URL=https://<url-produção> npx playwright test
```

Os testes de login usam `E2E_EMAIL` e `E2E_SENHA` de uma **conta de teste** separada, nunca a
senha real do dono.

### Desempenho e acessibilidade (Lighthouse)

Medição em produção (`https://carona-ja-theta.vercel.app`), Lighthouse 12.8, modo mobile com
throttling simulado de 4G lento (RTT 150 ms, 1,6 Mbps, CPU 4×). Meta: carregamento ≤ 3 s (SC-003)
e acessibilidade ≥ 90.

| Página    | Data       | LCP (carregamento) | FCP       | Desempenho | Acessibilidade | Resultado  |
| --------- | ---------- | ------------------ | --------- | ---------- | -------------- | ---------- |
| `/entrar` | 30/09/2026 | 2,3–2,6 s          | 0,9–1,1 s | 87–92      | 100            | ✅         |
| `/inicio` | —          | não medida         | —         | —          | —              | dispensada |

`/entrar` foi medida três vezes (faixa dos resultados). `/inicio` exige login; a medição foi
dispensada neste slice e pode ser feita pelo Chrome DevTools → Lighthouse, com a sessão aberta.

```bash
npx lighthouse https://<url-produção>/entrar --form-factor=mobile --only-categories=performance,accessibility --view
```

## Padrões para os próximos slices

Os slices 002–006 reutilizam o layout e os componentes definidos no slice 001. A referência
completa está em [`contracts/ui.md`](./specs/001-base-login-layout/contracts/ui.md) (layout,
componentes base, padrões visuais e formatadores) e as regras de rotas em
[`contracts/rotas.md`](./specs/001-base-login-layout/contracts/rotas.md).

### Adicionar um item de navegação

A Sidebar (desktop), a BottomNav (celular) e o título do cabeçalho leem a mesma lista em
[`components/layout/nav-items.ts`](./components/layout/nav-items.ts). Acrescente o item **somente
quando a tela já existir**, com um ícone do `lucide-react`:

```ts
import { House, Users } from 'lucide-react'

export const navItems: NavItem[] = [
  { rotulo: 'Início', href: '/inicio', icone: House },
  { rotulo: 'Passageiros', href: '/passageiros', icone: Users },
]
```

A BottomNav comporta no máximo 5 itens. O item fica ativo (`aria-current="page"`) na própria rota
e nas sub-rotas (ex.: `/passageiros/novo`).

### Criar uma página

Crie a pasta em `app/(app)/<recurso>/` com um `page.tsx`. O grupo `(app)` já aplica o `AppShell`
(cabeçalho, navegação e menu da conta), e o `proxy.ts` exige sessão em toda rota que não esteja
na lista pública de `lib/supabase/proxy.ts`. Use [`app/(app)/inicio/page.tsx`](<./app/(app)/inicio/page.tsx>)
como modelo:

- exporte `metadata` com o título no formato `'<Página> · Caronas Já'`;
- use `obterUsuarioLogado()` (de `lib/auth/sessao.ts`) quando precisar do usuário;
- componentes base: `EmptyState` para listas vazias, `ResponsiveTable` para listagens,
  `ConfirmDialog` para ações destrutivas, `toast` (sonner) para confirmações e `lib/format` para
  moeda e datas;
- textos da interface em pt-BR; nomes de componentes em inglês.

### Criar uma migração com RLS "somente o dono"

```bash
npx supabase migration new <nome_da_tabela>
```

Use [`supabase/migrations/20260930033131_perfis.sql`](./supabase/migrations/20260930033131_perfis.sql)
como modelo. Toda tabela nova deve:

1. ter uma coluna de dono, `usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade`
   (em `perfis`, o próprio `id` faz esse papel);
2. reutilizar o trigger `public.definir_atualizado_em()` para a coluna `atualizado_em`;
3. habilitar a RLS (`alter table ... enable row level security`);
4. ter políticas `to authenticated` que comparem o dono com `(select auth.uid())` em `using` e,
   nas escritas, em `with check`:

```sql
create policy "<tabela>: dono lê os próprios registros"
  on public.<tabela> for select to authenticated
  using (usuario_id = (select auth.uid()));

create policy "<tabela>: dono insere os próprios registros"
  on public.<tabela> for insert to authenticated
  with check (usuario_id = (select auth.uid()));

create policy "<tabela>: dono atualiza os próprios registros"
  on public.<tabela> for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

create policy "<tabela>: dono exclui os próprios registros"
  on public.<tabela> for delete to authenticated
  using (usuario_id = (select auth.uid()));
```

Aplique com `npx supabase db push` e confirme, com a chave anon, que outro usuário não vê as
linhas (como no cenário 11 do [quickstart](./specs/001-base-login-layout/quickstart.md)).

## Observação: pausa do plano gratuito do Supabase

No plano gratuito, o Supabase **pausa o projeto após cerca de 7 dias sem uso**. Enquanto estiver
pausado, o site abre, mas o login e os dados ficam indisponíveis ("Não foi possível conectar").
Para reativar, entre no [painel do Supabase](https://supabase.com/dashboard) e clique em
**Restore project**; a volta leva alguns minutos e nenhum dado é perdido. Usar o sistema ao
menos uma vez por semana evita a pausa.
