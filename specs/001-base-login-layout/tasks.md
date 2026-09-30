---

description: "Lista de tarefas do slice 001: Base do Projeto (Login, Layout Responsivo e Deploy Inicial)"
---

# Tarefas: Base do Projeto (Login, Layout Responsivo e Deploy Inicial)

**Entrada**: Documentos de design em `specs/001-base-login-layout/`

**Pré-requisitos**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Testes**: incluídos. A constituição exige testes automatizados para as regras de formatação e
cálculo e verificação em larguras de celular e desktop. O plano define Vitest (unitários) e
Playwright (e2e).

**Organização**: as tarefas estão agrupadas em **fatias verticais** (A, B, C). Cada fatia
corresponde a uma história de usuário, termina **publicada em produção** e pode ser implementada
em uma sessão separada. Para referenciar uma fatia na implementação, use o nome dela, por
exemplo: `/speckit-implement Fatia A`.

| Fatia | História | Fase | Tarefas | Depende de |
|-------|----------|------|---------|------------|
| Setup + Fundação | — | 1–2 | T001–T012 | — |
| **A. Esqueleto publicado** | US3 (P3) | 3 | T013–T020 | Setup + Fundação |
| **B. Login e sessão** | US1 (P1) | 4 | T021–T039 | Fatia A |
| **C. Layout e padrões visuais** | US2 (P2) | 5 | T040–T060 | Fatia B |
| Acabamento | — | 6 | T061–T065 | A, B, C |

> A ordem de execução (A → B → C) difere da prioridade da spec (P1 = login) porque o deploy é
> pré-requisito técnico para validar o login em produção (ver plan.md, "Fatias de Implementação").

## Formato: `[ID] [P?] [História] Descrição`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[História]**: US1, US2 ou US3 (ver spec.md)
- Tarefas marcadas **(manual)** exigem ação do usuário em um painel externo (GitHub, Supabase,
  Vercel). O agente deve parar, explicar o passo e aguardar confirmação.

## Convenções de caminho

Projeto único Next.js na raiz do repositório (`app/`, `components/`, `lib/`, `supabase/`,
`tests/`), conforme a seção "Estrutura do Projeto" do plan.md. Nomes seguem research.md §6:
domínio e rotas em pt-BR, código técnico em inglês.

---

## Fase 1: Setup (infraestrutura compartilhada)

**Objetivo**: inicializar o repositório e o projeto Next.js com ferramentas de qualidade.

- [X] T001 Inicializar o repositório git na raiz (`git init -b main`) e criar `.gitignore` com as regras do Next.js/Node e `.env*` ignorados, **exceto** `!.env.example`; manter `.specify/`, `.claude/` e `specs/` versionados
- [X] T002 Gerar o projeto Next.js com `npx create-next-app@latest` (TypeScript, Tailwind CSS, ESLint, App Router, **sem** `src/`, alias `@/*`, npm) em uma pasta temporária `_scaffold/` e mover o conteúdo para a raiz (a raiz não está vazia); definir `"name": "caronas-ja"` em `package.json` e apagar `_scaffold/`
- [X] T003 Inicializar o shadcn/ui com `npx shadcn@latest init` (estilo padrão, cor base **neutral**, variáveis CSS), gerando `components.json`, `lib/utils.ts` e os tokens em `app/globals.css`
- [X] T004 [P] Adicionar Prettier (`.prettierrc` com `prettier-plugin-tailwindcss`) e os scripts em `package.json`: `lint`, `typecheck` (`tsc --noEmit`), `format`, `test` (`vitest run`), `test:e2e` (`playwright test`)
- [X] T005 [P] Configurar o Vitest em `vitest.config.ts` (ambiente `node`, alias `@` → raiz, `include: ['tests/unit/**/*.test.ts']`) e instalar `vitest` como devDependency
- [X] T006 [P] Configurar o Playwright em `playwright.config.ts`: `testDir: 'tests/e2e'`; `baseURL` = `process.env.E2E_BASE_URL ?? 'http://localhost:3000'`; projetos `mobile` (viewport 360×800) e `desktop` (1280×800); `webServer` `npm run dev` só quando `E2E_BASE_URL` não estiver definido; instalar `@playwright/test`
- [X] T007 Ajustar `app/layout.tsx` com `<html lang="pt-BR">`, `metadata` (`title: 'Caronas Já'`, `description` em pt-BR) e `viewport` com `width=device-width, initial-scale=1`; remover o conteúdo de exemplo de `app/page.tsx` e os SVGs de exemplo de `public/`

---

## Fase 2: Fundação (pré-requisitos bloqueantes)

**Objetivo**: conexão com o Supabase e configuração de ambiente, usadas por todas as fatias.

**⚠️ CRÍTICO**: nenhuma fatia pode começar antes desta fase terminar.

- [X] T008 Inicializar o Supabase CLI com `npx supabase init` (gera `supabase/config.toml`) e, em `supabase/config.toml`, definir `[auth] site_url = "http://localhost:3000"`, `additional_redirect_urls = ["http://localhost:3000/**"]`, `enable_signup = false` e `[auth.email] enable_signup = false` (FR-003)
- [X] T009 [P] Criar `.env.example` com `NEXT_PUBLIC_SUPABASE_URL=`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=` e `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, cada uma com um comentário em pt-BR, conforme `contracts/ambiente.md`; **nunca** incluir `SUPABASE_SERVICE_ROLE_KEY`
- [X] T010 [P] Criar `lib/env.ts` exportando `env` com as três variáveis `NEXT_PUBLIC_*` lidas explicitamente (`process.env.NEXT_PUBLIC_SUPABASE_URL` etc.) e lançando o erro "Variável de ambiente X não configurada. Veja .env.example." quando alguma estiver ausente
- [X] T011 [P] Instalar `@supabase/supabase-js` e `@supabase/ssr` e criar `lib/supabase/client.ts` exportando `createClient()` com `createBrowserClient(env.supabaseUrl, env.supabaseAnonKey)`
- [X] T012 [P] Criar `lib/supabase/server.ts` exportando `async createClient()` com `createServerClient` e o adaptador de cookies de `next/headers` (`getAll`/`setAll`, ignorando o erro de `setAll` em Server Components), conforme a documentação do `@supabase/ssr`

**Checkpoint**: o projeto compila (`npm run typecheck`) e os clientes Supabase existem.

---

## Fase 3: Fatia A: Esqueleto publicado (US3, Prioridade P3)

**Objetivo**: site publicado na Vercel por HTTPS, conectado ao Supabase de produção, com deploy
automático a cada push na `main` e guia de publicação no README.

**Teste independente**: abrir a URL de produção no celular (4G) e ver a página provisória com
"Conexão com o banco: OK"; fazer push de uma alteração de texto e vê-la publicada em ≤ 10 min sem
ação manual (quickstart.md, "Validação da publicação").

### Testes da Fatia A

- [X] T013 [P] [US3] Criar `tests/e2e/publicacao.spec.ts`: ao visitar `/`, a página responde 200, exibe "Caronas Já" e o texto "Conexão com o banco: OK"; o teste deve rodar também contra produção via `E2E_BASE_URL`

### Implementação da Fatia A

- [X] T014 [P] [US3] Criar `lib/supabase/health.ts` com `checkSupabaseHealth(): Promise<boolean>`, que faz `fetch(`${env.supabaseUrl}/auth/v1/health`, { headers: { apikey: env.supabaseAnonKey }, cache: 'no-store' })` e retorna `res.ok`, capturando erros de rede como `false`
- [X] T015 [US3] Implementar a página provisória pública em `app/page.tsx` (Server Component, `dynamic = 'force-dynamic'`): título "Caronas Já", o texto "Em construção" e "Conexão com o banco: OK" ou "Conexão com o banco: indisponível", conforme `checkSupabaseHealth()` (depende de T014)
- [X] T016 [US3] Escrever `README.md` em pt-BR:
  - visão geral;
  - pré-requisitos (Node 20+, contas GitHub/Vercel/Supabase);
  - passo a passo para criar o projeto Supabase (região `sa-east-1`), preencher `.env.local` a partir de `.env.example`, `npx supabase link` e `npx supabase db push`;
  - configurar Auth (cadastro desligado, Site URL, Redirect URLs, template de e-mail), conforme `contracts/ambiente.md`;
  - importar o repositório na Vercel e configurar as variáveis em Production e Preview;
  - rodar `npm run dev`, `npm run test` e `npm run test:e2e`;
  - uma observação sobre a pausa do plano gratuito do Supabase após cerca de 7 dias sem uso (FR-023, SC-006)
- [X] T017 [US3] **(manual)** Criar o projeto no Supabase (região São Paulo `sa-east-1`), copiar a URL e a chave anon para `.env.local`, desligar "Allow new users to sign up" em Auth → Providers → Email e rodar `npx supabase link --project-ref <ref>`
- [X] T018 [US3] **(manual)** Criar o repositório no GitHub, confirmar que `.gitignore` exclui `.env.local`, fazer o primeiro commit e o `git push -u origin main`
- [X] T019 [US3] **(manual)** Importar o repositório na Vercel (framework Next.js, branch de produção `main`), cadastrar as três variáveis de `.env.example` (ver `specs/001-base-login-layout/contracts/ambiente.md`) em Production e Preview e fazer o deploy; em seguida, definir `NEXT_PUBLIC_SITE_URL` com a URL de produção e, no Supabase, preencher Auth → URL Configuration: Site URL = URL de produção; Redirect URLs = `<url-produção>/**`, `http://localhost:3000/**` e o padrão de previews da Vercel
- [X] T020 [US3] Validar a Fatia A: rodar `E2E_BASE_URL=<url-produção> npx playwright test tests/e2e/publicacao.spec.ts`, fazer push de uma alteração de texto e confirmar a publicação automática em ≤ 10 min (FR-020, FR-021, SC-005)

**Checkpoint (Fatia A)**: o site está no ar, conectado ao Supabase e com deploy automático.

---

## Fase 4: Fatia B: Login e sessão (US1, Prioridade P1) 🎯 MVP

**Objetivo**:

- login por e-mail e senha, sem cadastro público;
- sessão persistente e logout;
- recuperação de senha por e-mail;
- rotas protegidas no servidor com retorno à página de origem;
- tabela `perfis` com RLS.

**Teste independente**: em uma aba anônima, abrir `/inicio` → ser levado a `/entrar`; entrar com
a conta do dono → ver "Olá, {nome}" em `/inicio`; sair → `/inicio` fica bloqueada (quickstart.md,
cenários 1–6, 10 e 11).

### Testes da Fatia B (escrever primeiro e garantir que FALHEM)

- [X] T021 [P] [US1] Criar `tests/unit/redirect.test.ts` para `sanitizeNext(valor: string | null | undefined): string`. Casos:
  - `'/inicio'` → `'/inicio'`;
  - `'/inicio?x=1'` → `'/inicio?x=1'`;
  - `null`/`undefined`/`''` → `'/inicio'`;
  - `'//evil.com'` → `'/inicio'`;
  - `'https://evil.com'` → `'/inicio'`;
  - `'/a\\b'` → `'/inicio'`;
  - `'inicio'` (sem barra) → `'/inicio'`
- [X] T022 [P] [US1] Criar `tests/unit/auth-errors.test.ts` para `mapAuthError(error)`:
  - credencial inválida → "E-mail ou senha inválidos.";
  - status 429 → "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  - erro de rede (`TypeError`/`fetch failed`) → "Não foi possível conectar. Tente novamente.";
  - qualquer outro → a mensagem genérica de credencial (nunca revelar se o e-mail existe, FR-007)
- [X] T023 [P] [US1] Criar `tests/e2e/auth.spec.ts` (usa `E2E_EMAIL`/`E2E_SENHA` de uma conta de **teste**; `test.skip` se ausentes). Cenários:
  - sem sessão, `/inicio` → URL `/entrar?proximo=%2Finicio`;
  - senha errada → texto "E-mail ou senha inválidos." e continua em `/entrar`;
  - login válido → `/inicio` com texto "Olá,";
  - com sessão, `/entrar` → redireciona para `/inicio`;
  - após recarregar a página, continua logado;
  - "Sair" → `/entrar`, e `/inicio` volta a redirecionar;
  - `/entrar?proximo=//evil.com` + login → termina em `/inicio`

### Implementação da Fatia B

- [X] T024 [US1] Criar a migração `supabase/migrations/<timestamp>_perfis.sql` (via `npx supabase migration new perfis`) conforme `data-model.md` Parte 1:
  1. função `public.definir_atualizado_em()` (trigger `before update` que faz `new.atualizado_em = now()`);
  2. tabela `public.perfis` com `id uuid primary key references auth.users(id) on delete cascade`, `nome_exibicao text not null` com `check (char_length(trim(nome_exibicao)) between 1 and 60)`, `criado_em timestamptz not null default now()` e `atualizado_em timestamptz not null default now()`;
  3. trigger `perfis_definir_atualizado_em`;
  4. função `public.criar_perfil_novo_usuario()` `security definer set search_path = ''`, que insere o perfil com `nome_exibicao` = parte do e-mail antes do `@` (limitada a 60 caracteres);
  5. trigger `after insert on auth.users`;
  6. backfill `insert into public.perfis ... select from auth.users on conflict do nothing`;
  7. `alter table public.perfis enable row level security`;
  8. políticas `select` e `update` `using (id = (select auth.uid()))` (o `update` também com `with check`) para `authenticated`;
  9. nenhuma política de `insert`/`delete`
- [X] T025 [P] [US1] Implementar `sanitizeNext` em `lib/auth/redirect.ts`: aceita apenas valores que começam com `/`, não começam com `//` e não contêm `\`; caso contrário, retorna `'/inicio'` (faz T021 passar)
- [X] T026 [P] [US1] Implementar `mapAuthError` em `lib/auth/errors.ts` com as mensagens pt-BR da tabela "Mensagens de erro" de `contracts/rotas.md` (faz T022 passar)
- [X] T027 [US1] Criar `lib/supabase/proxy.ts` (Next 16: o antigo `middleware` agora se chama `proxy`) com `updateSession(request)`. Comportamento:
  - usa `createServerClient` com cookies de request/response e chama `supabase.auth.getUser()`;
  - rotas públicas: `/entrar`, `/esqueci-senha` e `/auth/*`;
  - `/`, `/redefinir-senha` e as demais rotas exigem sessão (`/` redireciona conforme a sessão em T037);
  - sem usuário em rota protegida → redireciona para `/entrar?proximo=<pathname+search codificado>`, acrescentando `&motivo=expirada` se existir algum cookie `sb-*-auth-token`;
  - com usuário em `/entrar` → redireciona para `/inicio`
- [X] T028 [US1] Criar `proxy.ts` na raiz (export `proxy`; substitui `middleware.ts` no Next 16) chamando `updateSession` com `matcher` que exclui `_next/static`, `_next/image`, `favicon.ico` e arquivos de imagem (depende de T027)
- [X] T029 [US1] Adicionar os componentes shadcn necessários às telas de acesso: `npx shadcn@latest add button input label card sonner` (gera arquivos em `components/ui/`) e montar `<Toaster richColors position="top-center" />` em `app/layout.tsx`
- [X] T030 [US1] Criar `app/(publico)/layout.tsx`: layout centralizado (card de largura máxima de 400px, padding de 16px no celular) com o nome "Caronas Já" acima do conteúdo
- [X] T031 [US1] Criar `app/(publico)/entrar/actions.ts` com a server action `entrar(formData)`:
  - valida e-mail e senha não vazios;
  - chama `supabase.auth.signInWithPassword`;
  - em caso de erro, retorna `{ erro: mapAuthError(error) }`;
  - em caso de sucesso, faz `redirect(sanitizeNext(formData.get('proximo')))`
- [X] T032 [US1] Criar `app/(publico)/entrar/page.tsx`:
  - formulário com campos "E-mail" (`type=email`, `autocomplete=email`) e "Senha" (`type=password`, `autocomplete=current-password`) e um input oculto `proximo`;
  - botão "Entrar" com estado de carregamento (`useActionState`) e mensagem de erro abaixo do formulário;
  - aviso "Sua sessão expirou, entre novamente" quando `motivo=expirada`;
  - aviso "Este link é inválido ou expirou. Solicite um novo." quando `erro=link-invalido`;
  - link "Esqueci minha senha" → `/esqueci-senha`;
  - **sem** link de cadastro (FR-002, FR-003, FR-007, FR-009)
- [X] T033 [P] [US1] Criar `app/(publico)/esqueci-senha/page.tsx` e `actions.ts`:
  - formulário de e-mail que chama `supabase.auth.resetPasswordForEmail(email, { redirectTo: `${env.siteUrl}/auth/confirmar?next=/redefinir-senha` })`;
  - **sempre** exibe "Se o e-mail estiver cadastrado, você receberá um link." (exceto o 429, que usa `mapAuthError`);
  - link "Voltar para o login" (FR-006, FR-007)
- [X] T034 [P] [US1] Criar `app/auth/confirmar/route.ts` (GET):
  - lê `token_hash`, `type` e `next`;
  - chama `supabase.auth.verifyOtp({ type, token_hash })`;
  - em caso de sucesso, `redirect(sanitizeNext(next))`;
  - em caso de falha ou parâmetro ausente, `redirect('/entrar?erro=link-invalido')`
- [X] T035 [US1] Criar `app/(publico)/redefinir-senha/page.tsx` e `actions.ts`:
  - campos "Nova senha" e "Confirmar nova senha" (`autocomplete=new-password`);
  - validar `mínimo 8 caracteres` e igualdade ("As senhas não conferem.");
  - chamar `supabase.auth.updateUser({ password })`;
  - em caso de sucesso, `redirect('/inicio?senha=atualizada')`;
  - sem sessão de recuperação → redirecionar para `/entrar?erro=link-invalido`
- [X] T036 [P] [US1] Criar `app/sair/route.ts` (POST): chama `supabase.auth.signOut()` e faz `NextResponse.redirect(new URL('/entrar', request.url), 303)` (FR-005)
- [X] T037 [US1] Substituir a página provisória de `app/page.tsx` por um redirecionamento: com sessão (`getUser()`) → `/inicio`, sem sessão → `/entrar`; remover `lib/supabase/health.ts` e atualizar `tests/e2e/publicacao.spec.ts` para verificar que `/` leva a `/entrar` e que a página exibe o botão "Entrar"
- [X] T038 [US1] Criar `app/(app)/layout.tsx` (Server Component) e `app/(app)/inicio/page.tsx`:
  - o layout chama `getUser()` e faz `redirect('/entrar')` se não houver usuário (defesa em profundidade além do middleware);
  - o layout busca `nome_exibicao` em `perfis` e renderiza um cabeçalho mínimo provisório com "Caronas Já", nome, e-mail e um `<form action="/sair" method="post">` com o botão "Sair" (será substituído pelo AppShell na Fatia C);
  - `inicio/page.tsx` exibe "Olá, {nome_exibicao}";
  - um componente cliente dispara `toast.success('Senha atualizada')` quando `?senha=atualizada`
- [X] T039 [US1] **(manual)** Validar e publicar a Fatia B:
  1. `npx supabase db push` (aplica `supabase/migrations/<timestamp>_perfis.sql`);
  2. criar a conta do dono em Auth → Users → Add user (auto-confirm);
  3. traduzir o template "Reset Password" para pt-BR com o link `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=recovery&next=/redefinir-senha`;
  4. criar uma conta de **teste** separada para `E2E_EMAIL`/`E2E_SENHA`;
  5. rodar `npm run test` e `npm run test:e2e`;
  6. fazer push na `main` e executar os cenários 1–6, 10 e 11 do quickstart.md em produção

**Checkpoint (Fatia B)**: só o dono entra; as rotas internas estão protegidas; a sessão
persiste; a recuperação de senha funciona em produção.

---

## Fase 5: Fatia C: Layout e padrões visuais (US2, Prioridade P2)

**Objetivo**:

- AppShell responsivo baseado no dashboard do shadcn/ui: Sidebar a partir de 768px e BottomNav
  abaixo disso;
- tema claro/escuro automático com alternância manual;
- componentes base e formatadores pt-BR reutilizáveis pelos slices 002–006;
- estado vazio em `/inicio` e páginas de erro.

**Teste independente**: logado, abrir o site em 360, 768, 1280 e 1920px, sem rolagem horizontal,
com BottomNav/Sidebar corretas; alternar o tema e recarregar mantém a escolha; `/nao-existe`
mostra a página 404 em pt-BR (quickstart.md, cenários 7–9).

### Testes da Fatia C (escrever primeiro e garantir que FALHEM)

- [X] T040 [P] [US2] Criar `tests/unit/format.test.ts` cobrindo `contracts/ui.md` → "Formatadores":
  - `formatCurrency(123456)` → `'R$ 1.234,56'`, `formatCurrency(0)` → `'R$ 0,00'` e `formatCurrency(5)` → `'R$ 0,05'` (comparar normalizando o espaço não separável ` ` para espaço comum);
  - `formatDate('2026-09-28T10:45:00Z')` → `'28/09/2026'`;
  - `formatTime('2026-09-28T10:45:00Z')` → `'07:45'` (fuso `America/Sao_Paulo`);
  - `formatDateTime(...)` → `'28/09/2026 07:45'`;
  - `formatMonth('2026-09-15T12:00:00Z')` → `'setembro de 2026'`;
  - virada de fuso: `formatDate('2026-10-01T02:00:00Z')` → `'30/09/2026'`;
  - `formatCurrency(1.5)` lança erro (centavos devem ser inteiros)
- [X] T041 [P] [US2] Criar `tests/e2e/layout.spec.ts` (logado via `E2E_EMAIL`/`E2E_SENHA`). Verificações:
  - para as larguras 360, 768, 1280 e 1920px: `document.documentElement.scrollWidth <= clientWidth`;
  - em 360px, a BottomNav fica visível e a Sidebar oculta; em 1280px, o contrário;
  - o item "Início" tem `aria-current="page"` e bounding box ≥ 44×44px;
  - com `colorScheme: 'dark'` emulado, `<html>` tem a classe `dark`; clicar em "Alternar tema" remove a classe; a escolha persiste após reload;
  - `/nao-existe` exibe "Página não encontrada" e um link para `/inicio`;
  - `/inicio` exibe o estado vazio sem links para rotas inexistentes

### Implementação da Fatia C

- [X] T042 [P] [US2] Implementar `lib/format.ts` com `formatCurrency(centavos: number)`, `formatDate`, `formatTime`, `formatDateTime` e `formatMonth`:
  - usar `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` e `Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', ... })`;
  - exportar a constante `TIME_ZONE = 'America/Sao_Paulo'`;
  - `formatCurrency` lança `Error('Valor em centavos deve ser inteiro')` se `!Number.isInteger(centavos)` (faz T040 passar)
- [X] T043 [US2] Adicionar os componentes shadcn do layout: `npx shadcn@latest add sidebar sheet dropdown-menu avatar separator skeleton table alert-dialog tooltip` e, em `components/ui/button.tsx`, garantir altura mínima de 44px (`min-h-11`) nos tamanhos `default` e `icon` (FR-015)
- [X] T044 [P] [US2] Instalar `next-themes` e criar `components/theme-provider.tsx`; em `app/layout.tsx`, envolver o app com `<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>` e adicionar `suppressHydrationWarning` ao `<html>` (FR-017)
- [X] T045 [P] [US2] Criar `components/theme-toggle.tsx`: botão `variant="ghost" size="icon"` com `aria-label="Alternar tema"`, ícones `Sun`/`Moon` do `lucide-react`, alternando entre `light` e `dark` via `useTheme()` com base em `resolvedTheme`
- [X] T046 [P] [US2] Criar `components/layout/nav-items.ts` exportando `navItems: { rotulo: string; href: string; icone: LucideIcon }[]`, **apenas** com `{ rotulo: 'Início', href: '/inicio', icone: House }` e um comentário indicando que cada slice futuro adiciona seu item aqui (máx. 5 itens para a BottomNav) (FR-013)
- [X] T047 [US2] Criar `components/layout/app-sidebar.tsx` a partir do bloco de dashboard do shadcn/ui:
  - `Sidebar` com `collapsible="none"`, visível apenas em `md:` (≥ 768px);
  - cabeçalho "Caronas Já" e itens de `navItems` com `isActive` pela rota atual (`usePathname`) e `aria-current="page"`;
  - rodapé com o nome e o e-mail da conta (FR-011)
- [X] T048 [P] [US2] Criar `components/layout/bottom-nav.tsx`:
  - `<nav>` fixa no rodapé, com `md:hidden`, fundo `bg-background`, borda superior e `pb-[env(safe-area-inset-bottom)]`;
  - itens de `navItems` com ícone e rótulo, cada um com área mínima de 44×44px e `aria-current="page"` no ativo (FR-011, FR-015)
- [X] T049 [US2] Criar `components/layout/app-header.tsx`:
  - "Caronas Já" visível apenas no celular e o título da página recebido por prop;
  - `ThemeToggle`;
  - `DropdownMenu` da conta (Avatar com as iniciais, nome, e-mail e o item "Sair", que submete `<form action="/sair" method="post">`) (FR-012)
- [X] T050 [US2] Criar `components/layout/app-shell.tsx`:
  - compõe `SidebarProvider` + `AppSidebar` + `AppHeader` + `<main>` + `BottomNav`;
  - `<main>` tem largura máxima de 1200px centralizada, padding de 16px e `pb-24 md:pb-6`, para não ficar coberto pela BottomNav;
  - recebe `usuario: { nome: string; email: string }` (depende de T045–T049)
- [X] T051 [US2] Atualizar `app/(app)/layout.tsx` para usar `AppShell` com os dados de `perfis`/`getUser()`, removendo o cabeçalho provisório criado em T038
- [X] T052 [P] [US2] Criar `components/empty-state.tsx` com as props `icone`, `titulo`, `descricao` e `acao?` (ReactNode), centralizado e com texto `text-muted-foreground`
- [X] T053 [P] [US2] Criar `components/responsive-table.tsx`:
  - componente genérico `<ResponsiveTable<T> colunas={[{ chave, titulo, render?, essencial? }]} linhas={T[]} chaveLinha={(l) => string} vazio={ReactNode} />`;
  - a partir de 768px, renderiza o `Table` do shadcn;
  - abaixo de 768px, renderiza uma lista de `Card` com as colunas `essencial` (Princípio IV)
- [X] T054 [P] [US2] Criar `components/confirm-dialog.tsx` sobre o `AlertDialog`, com as props `titulo`, `descricao`, `textoConfirmar` (padrão "Confirmar"), `textoCancelar` (padrão "Cancelar"), `onConfirmar` e `gatilho`; o botão de confirmação usa `variant="destructive"`
- [X] T055 [US2] Atualizar `app/(app)/inicio/page.tsx`:
  - saudação "Olá, {nome_exibicao}";
  - `EmptyState` com o ícone `Car`, o título "Tudo pronto por aqui" e a descrição "Em breve você poderá cadastrar passageiros, registrar viagens e acompanhar pagamentos.";
  - **sem** botões nem links para telas inexistentes (FR-018)
- [X] T056 [P] [US2] Criar `app/not-found.tsx`: "Página não encontrada", uma descrição curta e um botão-link "Voltar ao início" → `/inicio` (FR-019)
- [X] T057 [P] [US2] Criar `app/(app)/error.tsx` e `app/(publico)/error.tsx` (Client Components): mensagem "Não foi possível conectar. Tente novamente." e botão "Tentar novamente" chamando `reset()` (FR-019). *Nota: no Next 16 a prop do `error.tsx` chama-se `retry()`; o conteúdo comum fica em `components/erro-conexao.tsx`.*
- [X] T058 [US2] Definir a identidade visual em `app/globals.css` e `app/layout.tsx`:
  - fonte Geist via `next/font`, com tamanho base de 16px;
  - **uma** cor de destaque em `--primary`/`--primary-foreground` nos temas claro e escuro (sugestão: verde-azulado), com contraste ≥ 4.5:1 conferido nos dois temas (FR-010, FR-015)
- [X] T059 [US2] Usar os formatadores de `lib/format.ts` onde houver datas na base (ex.: "Membro desde {formatDate(criado_em)}" no menu da conta, em `components/layout/app-header.tsx`), para validar a integração dos formatadores com a interface
- [X] T060 [US2] Validar e publicar a Fatia C: rodar `npm run test` e `npm run test:e2e`, fazer push na `main` e executar os cenários 7–9 do quickstart.md em produção, no celular real e no computador

**Checkpoint (Fatia C)**: o layout responsivo, o tema e os componentes base estão prontos e
documentados para os slices 002–006.

---

## Fase 6: Acabamento e verificações transversais

- [ ] T061 [P] Acrescentar ao `README.md` a seção "Padrões para os próximos slices":
  - como adicionar um item em `components/layout/nav-items.ts`;
  - como criar uma página em `app/(app)/<recurso>/`;
  - como criar uma migração com RLS "somente o dono" (usar `perfis` como modelo);
  - links para `specs/001-base-login-layout/contracts/ui.md`
- [ ] T062 [P] Revisão de segurança (FR-024, Princípio VI):
  - buscar no repositório por `service_role`, `eyJ` e `sk_`: nenhum resultado fora de exemplos vazios;
  - confirmar que `.env.local` está ignorado pelo git;
  - confirmar que a API pública rejeita cadastro ("Signups not allowed");
  - confirmar que `perfis` não retorna linhas de outro usuário (quickstart.md, cenários 10 e 11)
- [ ] T063 Rodar os scripts de `package.json` (`npm run lint`, `npm run typecheck`, `npm run test` e `npm run test:e2e`) e corrigir as falhas
- [ ] T064 Medir no Lighthouse (modo mobile, throttling 4G) as páginas `/entrar` e `/inicio` de produção: carregamento ≤ 3s (SC-003) e acessibilidade ≥ 90; registrar o resultado no `README.md`
- [ ] T065 Executar a validação completa do `specs/001-base-login-layout/quickstart.md` em produção e marcar o slice 001 como concluído

---

## Dependências e Ordem de Execução

### Dependências entre fases

- **Setup (Fase 1)**: sem dependências.
- **Fundação (Fase 2)**: depende do Setup e **bloqueia** todas as fatias.
- **Fatia A (Fase 3)**: depende da Fundação.
- **Fatia B (Fase 4)**: depende da Fatia A (precisa do deploy e do projeto Supabase para validar
  o login em produção).
- **Fatia C (Fase 5)**: depende da Fatia B (o AppShell envolve as páginas autenticadas e usa os
  dados de `perfis`).
- **Acabamento (Fase 6)**: depende das três fatias.

### Dependências dentro das fatias

- **Fatia A**: T013 (teste) → T014 → T015; T016 é independente; T017 → T018 → T019 → T020.
- **Fatia B**: T021–T023 (testes) antes de T025/T026; T024 é independente do código; T027 → T028;
  T029 → T030 → T031 → T032; T033, T034 e T036 dependem só de T012 e T025; T035 depende de T034;
  T037 e T038 dependem de T028; T039 fecha a fatia.
- **Fatia C**: T040/T041 (testes) primeiro; T042 é independente; T043 → T047/T049; T044 → T045;
  T045–T049 → T050 → T051; T052–T054 são independentes; T055 depende de T051 e T052; T060 fecha
  a fatia.

### Oportunidades de paralelismo

- **Setup**: T004, T005 e T006 em paralelo após T003.
- **Fundação**: T009–T012 em paralelo após T008.
- **Fatia B**: T021, T022 e T023 juntos; T025 e T026 juntos; T033, T034 e T036 juntos.
- **Fatia C**: T040 e T041 juntos; T042, T044, T045, T046, T048, T052, T053, T054, T056 e T057 em
  paralelo (arquivos distintos).

---

## Exemplo de Paralelismo: Fatia B (US1)

```text
# Testes primeiro, juntos:
Tarefa: "T021 tests/unit/redirect.test.ts"
Tarefa: "T022 tests/unit/auth-errors.test.ts"
Tarefa: "T023 tests/e2e/auth.spec.ts"

# Utilitários, juntos:
Tarefa: "T025 lib/auth/redirect.ts"
Tarefa: "T026 lib/auth/errors.ts"

# Rotas independentes, juntas:
Tarefa: "T033 app/(publico)/esqueci-senha/"
Tarefa: "T034 app/auth/confirmar/route.ts"
Tarefa: "T036 app/sair/route.ts"
```

## Exemplo de Paralelismo: Fatia C (US2)

```text
Tarefa: "T042 lib/format.ts"
Tarefa: "T046 components/layout/nav-items.ts"
Tarefa: "T048 components/layout/bottom-nav.tsx"
Tarefa: "T052 components/empty-state.tsx"
Tarefa: "T053 components/responsive-table.tsx"
Tarefa: "T054 components/confirm-dialog.tsx"
Tarefa: "T056 app/not-found.tsx"
```

---

## Estratégia de Implementação

### Uma fatia por sessão

| Sessão | Comando sugerido | Resultado publicado |
|--------|------------------|---------------------|
| 1 | `/speckit-implement Fase 1, Fase 2 e Fatia A (T001–T020)` | Site no ar, conectado ao Supabase, com deploy automático |
| 2 | `/speckit-implement Fatia B (T021–T039)` | Login, logout, recuperação de senha e rotas protegidas (**MVP de acesso**) |
| 3 | `/speckit-implement Fatia C (T040–T060)` | Layout responsivo, tema e componentes para os próximos slices |
| 4 | `/speckit-implement Fase 6 (T061–T065)` | Slice 001 validado e documentado |

Ao final de cada sessão: **PARAR e VALIDAR** pelo checkpoint da fatia antes de seguir.

### MVP

O MVP de acesso é Setup + Fundação + Fatia A + **Fatia B**: o dono já consegue entrar com
segurança no sistema publicado. A Fatia C é necessária antes do slice 002 (Passageiros), porque
define o layout que ele reutiliza.

### Entrega incremental

1. Setup + Fundação + Fatia A → site publicado (esqueleto).
2. Fatia B → acesso seguro (MVP).
3. Fatia C → interface padronizada.
4. Acabamento → slice 001 concluído; o próximo passo é `/speckit-specify` do slice 002.

---

## Notas

- [P] = arquivos diferentes, sem dependências pendentes.
- O rótulo [US#] liga a tarefa à história da spec, para rastreabilidade.
- Tarefas **(manual)** exigem ação do usuário em painéis externos. Nunca colocar senhas reais no
  código ou nos testes: o e2e usa apenas uma conta de **teste**.
- Fazer commit ao final de cada tarefa ou grupo lógico, com mensagens em pt-BR.
- Cada fatia termina publicada (constituição, "Fluxo de Desenvolvimento").
