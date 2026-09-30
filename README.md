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

| Local no painel                                    | Configuração                                                                                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Authentication → Sign In / Providers → Email       | Provedor habilitado; **desligar** "Allow new users to sign up"                                                                             |
| Authentication → URL Configuration → Site URL      | URL de produção (a mesma de `NEXT_PUBLIC_SITE_URL` na Vercel)                                                                              |
| Authentication → URL Configuration → Redirect URLs | `<url-produção>/**`, `http://localhost:3000/**` e o padrão de previews da Vercel (ex.: `https://carona-ja-*-giovanna-chatack.vercel.app/**`) |
| Authentication → Email Templates → Reset Password  | Texto em pt-BR, com o link `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=recovery&next=/redefinir-senha`                 |
| Authentication → Users → Add user                  | Criar a conta do dono (e-mail e senha), marcada como confirmada                                                                            |

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

## Observação: pausa do plano gratuito do Supabase

No plano gratuito, o Supabase **pausa o projeto após cerca de 7 dias sem uso**. Enquanto estiver
pausado, o site abre, mas o login e os dados ficam indisponíveis ("Não foi possível conectar").
Para reativar, entre no [painel do Supabase](https://supabase.com/dashboard) e clique em
**Restore project**; a volta leva alguns minutos e nenhum dado é perdido. Usar o sistema ao
menos uma vez por semana evita a pausa.
