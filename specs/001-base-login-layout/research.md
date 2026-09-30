# Pesquisa (Fase 0): Base do Projeto

**Funcionalidade**: `specs/001-base-login-layout` | **Data**: 2026-09-28

Todas as decisões abaixo resolvem os itens "NEEDS CLARIFICATION" do Contexto Técnico do
[plan.md](./plan.md).

## 1. Framework do frontend

- **Decisão**: Next.js (App Router) com TypeScript, na versão estável mais recente suportada pela
  Vercel.
- **Justificativa**: o shadcn/ui (escolhido na spec, FR-010) é construído para React/Next.js, e a
  Vercel tem deploy nativo e sem configuração para Next.js. Existe ainda o template oficial
  "Next.js + Supabase", que já resolve sessão por cookies e middleware (Princípio III).
- **Alternativas consideradas**: Vite + React SPA (não protege rotas no servidor e exige lidar com
  tokens no cliente); SvelteKit/Nuxt (o shadcn/ui oficial não atende a esses frameworks).

## 2. Template visual e componentes

- **Decisão**: shadcn/ui com Tailwind CSS. Partir do bloco de dashboard com barra lateral
  (`sidebar`/`dashboard-01`) e adaptá-lo: barra lateral a partir de 768px e barra de navegação
  inferior própria abaixo de 768px. Ícones: `lucide-react` (padrão do shadcn/ui).
- **Justificativa**: os componentes são copiados para dentro do projeto (sem dependência
  "caixa-preta") e são acessíveis por padrão (Radix). Tema claro/escuro por variáveis CSS.
- **Alternativas consideradas**: Tremor e Mantine (descartados na spec, Q2).

## 3. Tema claro/escuro

- **Decisão**: `next-themes` com `attribute="class"`, `defaultTheme="system"` e `enableSystem`;
  botão de alternância no cabeçalho. A preferência fica salva no `localStorage` do dispositivo.
- **Justificativa**: é a integração documentada pelo shadcn/ui e evita o "flash" de tema errado
  no carregamento (FR-017).
- **Alternativas consideradas**: implementação manual com `prefers-color-scheme` (reinventa o que
  a biblioteca resolve).

## 4. Autenticação

- **Decisão**: Supabase Auth com e-mail e senha, integrado via `@supabase/ssr` (sessão em cookies,
  renovada no middleware do Next.js).
  - Cadastro público **desabilitado** nas configurações de Auth (`enable_signup = false`). A conta
    do dono é criada uma única vez pelo painel do Supabase (FR-003).
  - Recuperação de senha: `resetPasswordForEmail` → e-mail com link → rota `/auth/confirmar`
    valida o token (`verifyOtp` com `token_hash`) → página `/redefinir-senha` (FR-006).
  - Limite de tentativas: rate limiting nativo do Supabase Auth; a interface mostra a mensagem
    "Muitas tentativas. Aguarde alguns minutos." ao receber erro 429 (FR-008).
  - Mensagem de erro genérica: "E-mail ou senha inválidos." para qualquer falha de credencial
    (FR-007).
  - Retorno à página de origem: o middleware redireciona para `/entrar?proximo=<rota>`; após o
    login, só são aceitos caminhos internos (começando com `/` e sem `//`), para evitar redirect
    aberto (FR-009).
- **Justificativa**: recurso nativo do Supabase, sem backend próprio (Princípio III), e sessão
  validada no servidor (Princípio VI).
- **Alternativas consideradas**: NextAuth/Auth.js (camada extra desnecessária); tokens em
  `localStorage` (menos seguro e sem proteção de rota no servidor).

## 5. Banco de dados e migrações

- **Decisão**: Supabase CLI com migrações SQL versionadas em `supabase/migrations/`, aplicadas em
  produção com `supabase db push`. Desenvolvimento local opcional com `supabase start` (Docker).
- **Justificativa**: atende à constituição ("esquema versionado por migrações SQL"). Não exige
  serviços adicionais.
- **Alternativas consideradas**: ORM (Prisma/Drizzle), que duplica a definição do esquema e
  complica a RLS; alterações manuais pelo painel, que são proibidas pela constituição.

## 6. Convenção de nomes (Princípio I)

- **Decisão**:
  - **Domínio em português**: tabelas, colunas, rotas de URL e textos (`passageiros`,
    `valor_centavos`, `/entrar`, `/inicio`).
  - **Código técnico em inglês**: nomes de componentes, funções utilitárias, pastas e variáveis
    de ambiente (`AppShell`, `formatCurrency`, `NEXT_PUBLIC_SUPABASE_URL`), seguindo as convenções
    do Next.js e do shadcn/ui.
- **Justificativa**: rotas e dados ficam legíveis em pt-BR para o usuário, e o código segue o
  ecossistema sem traduções forçadas. A regra é uma só e fica registrada aqui, como pede a
  constituição.

## 7. Formatação pt-BR

- **Decisão**: utilitários próprios sobre `Intl.NumberFormat('pt-BR', { style: 'currency',
  currency: 'BRL' })` e `Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' })`, sem
  bibliotecas de data neste slice. Valores sempre em centavos (inteiros) na entrada.
- **Justificativa**: nativo, sem dependências e cobre FR-016. Testado com testes unitários.
- **Alternativas consideradas**: `date-fns`/`dayjs` (desnecessários por enquanto; podem entrar no
  slice de Viagens se houver necessidade de cálculos de datas).

## 8. Testes

- **Decisão**:
  - **Vitest** para testes unitários (formatadores, validação de `proximo`).
  - **Playwright** para testes de ponta a ponta de fumaça: redirecionamento sem login, login,
    logout, ausência de rolagem horizontal em 360/768/1280/1920px e alternância de tema.
- **Justificativa**: a constituição exige testes para regras de cálculo e verificação em larguras
  de celular e desktop. O Playwright automatiza SC-002 e SC-004.
- **Alternativas consideradas**: Jest (mais lento, configuração ESM mais trabalhosa); somente
  testes manuais (não é repetível entre slices).

## 9. Publicação

- **Decisão**: integração Git da Vercel (push na `main` gera produção; outros branches geram
  previews). Variáveis de ambiente configuradas no painel da Vercel. URL do site cadastrada no
  Supabase em Auth → URL Configuration (Site URL e Redirect URLs, incluindo previews
  `https://*-<time>.vercel.app/**`).
- **Justificativa**: publicação automática sem passos manuais (FR-021, SC-005) e custo zero nos
  planos gratuitos (SC-007).
- **Observação**: o plano gratuito do Supabase pausa projetos após cerca de 7 dias sem atividade.
  Com uso diário isso não ocorre; o guia explica como reativar.

## 10. E-mails de autenticação

- **Decisão**: usar o envio de e-mails padrão do Supabase para a recuperação de senha, com os
  templates traduzidos para pt-BR no painel.
- **Justificativa**: há um único usuário e poucos e-mails, dentro do limite do plano gratuito.
- **Alternativa futura**: SMTP próprio (ex.: Resend), apenas se o limite de envio virar problema.
