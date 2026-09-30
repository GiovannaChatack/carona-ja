# Contrato: Variáveis de Ambiente e Configuração Externa

Estas variáveis devem estar listadas em `.env.example` (sem valores reais) e configuradas na
Vercel (Production e Preview) e no `.env.local` para desenvolvimento.

| Variável | Exposta ao navegador | Obrigatória | Descrição |
|----------|----------------------|-------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | sim | sim | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sim | sim | Chave pública (anon/publishable). É segura no navegador **porque** todas as tabelas têm RLS |
| `NEXT_PUBLIC_SITE_URL` | sim | sim | URL pública do site (ex.: `https://caronas-ja.vercel.app`); usada nos links de e-mail |

**Proibido**: `SUPABASE_SERVICE_ROLE_KEY` ou qualquer chave secreta no frontend ou no repositório
(Princípio VI). Este slice não precisa de chave secreta.

## Configuração no painel do Supabase

| Local | Valor |
|-------|-------|
| Auth → Providers → Email | Habilitado; "Allow new users to sign up" **desligado** |
| Auth → URL Configuration → Site URL | valor de `NEXT_PUBLIC_SITE_URL` |
| Auth → URL Configuration → Redirect URLs | `NEXT_PUBLIC_SITE_URL/**`, `http://localhost:3000/**` e o padrão de previews da Vercel |
| Auth → Email Templates → Reset Password | Texto em pt-BR; link para `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=recovery&next=/redefinir-senha` |
| Auth → Users | Criar manualmente a conta do dono (e-mail + senha), marcada como confirmada |

## Configuração na Vercel

| Item | Valor |
|------|-------|
| Framework | Next.js (detectado automaticamente) |
| Branch de produção | `main` |
| Variáveis | as três acima, em Production e Preview |
