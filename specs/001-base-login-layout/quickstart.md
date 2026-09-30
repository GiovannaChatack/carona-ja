# Quickstart / Guia de Validação: Base do Projeto

Este guia mostra que o slice 001 funciona de ponta a ponta. Os detalhes de configuração estão em
[contracts/ambiente.md](./contracts/ambiente.md), as rotas em [contracts/rotas.md](./contracts/rotas.md)
e o layout em [contracts/ui.md](./contracts/ui.md).

## Pré-requisitos

- Node.js 20 LTS ou superior e npm
- Conta no GitHub, na Vercel e no Supabase (planos gratuitos)
- Supabase CLI (`npx supabase ...`) e, opcionalmente, Docker para o banco local

## Configuração local

```bash
npm install
```

```bash
cp .env.example .env.local
```

Preencha `.env.local` com a URL e a chave anon do projeto Supabase.

```bash
npx supabase link --project-ref <ref-do-projeto>
```

```bash
npx supabase db push
```

```bash
npm run dev
```

Crie a conta do dono no painel do Supabase (Auth → Users → Add user, marcada como confirmada).

## Validação automatizada

```bash
npm run lint
```

```bash
npm run test
```

Esperado: os testes unitários dos formatadores e da validação de `proximo` passam.

```bash
npm run test:e2e
```

Esperado: os testes de fumaça do Playwright passam. Eles precisam de `E2E_EMAIL`/`E2E_SENHA` no
ambiente de teste, com uma conta de teste criada no projeto local ou de desenvolvimento, nunca a
senha real de produção.

## Cenários de validação manual

| # | Cenário | Resultado esperado | Ref. |
|---|---------|--------------------|------|
| 1 | Abrir `/inicio` em uma aba anônima | Redireciona para `/entrar?proximo=%2Finicio` | FR-001, SC-002 |
| 2 | Entrar com senha errada | "E-mail ou senha inválidos." e continua em `/entrar` | FR-007 |
| 3 | Entrar com a conta do dono | Chega a `/inicio` com "Olá, {nome}" e o estado vazio em até 3s | FR-002, FR-018, SC-001, SC-003 |
| 4 | Fechar e reabrir o navegador | Continua logado | FR-004 |
| 5 | "Sair" no menu da conta | Volta para `/entrar`, e `/inicio` fica bloqueado | FR-005 |
| 6 | "Esqueci minha senha" → abrir o link do e-mail → nova senha | Senha trocada; login com a nova senha funciona | FR-006 |
| 7 | Redimensionar para 360, 768, 1280 e 1920px | BottomNav < 768px, Sidebar ≥ 768px, sem rolagem horizontal | FR-011, SC-004 |
| 8 | Dispositivo em modo escuro → abrir o site → alternar tema → recarregar | Abre escuro; troca na hora; mantém a escolha manual | FR-017 |
| 9 | Acessar `/nao-existe` | Página "Página não encontrada" em pt-BR | FR-019 |
| 10 | Tentar se cadastrar pela API pública com a chave anon | Erro "Signups not allowed" | FR-003 |
| 11 | Consultar `perfis` de outro id com a chave anon | Nenhuma linha retornada (RLS) | FR-022 |

## Validação da publicação

1. Faça push na `main` → acompanhe o deploy na Vercel → abra a URL de produção por HTTPS no
   celular (4G). Esperado: a tela de login carrega (FR-020, SC-005).
2. Altere um texto qualquer, faça push e confirme que a mudança aparece em até 10 minutos, sem
   ação manual (FR-021, SC-005).
3. Busque no repositório por `service_role` e por chaves: nenhum resultado fora de
   `.env.example` com valores vazios (FR-024).
