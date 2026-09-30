# Contrato: Rotas da Aplicação (slice 001)

As rotas de URL ficam em português (ver [research.md §6](../research.md)).

| Rota | Acesso | Descrição | Requisitos |
|------|--------|-----------|------------|
| `/` | qualquer | Redireciona para `/inicio` se houver sessão, senão para `/entrar` | FR-001 |
| `/entrar` | pública (redireciona para `/inicio` se logado) | Formulário de e-mail e senha; link "Esqueci minha senha" | FR-002, FR-007, FR-008 |
| `/esqueci-senha` | pública | Formulário de e-mail. Sempre responde "Se o e-mail estiver cadastrado, você receberá um link." | FR-006, FR-007 |
| `/auth/confirmar` | pública (route handler) | Recebe `token_hash` e `type`, valida o token e redireciona para `next` (ex.: `/redefinir-senha`) ou para `/entrar?erro=link-invalido` | FR-006 |
| `/redefinir-senha` | requer sessão de recuperação | Nova senha + confirmação (mínimo 8 caracteres). Ao salvar, vai para `/inicio` com o toast "Senha atualizada" | FR-006 |
| `/sair` | autenticada (POST) | Encerra a sessão e redireciona para `/entrar` | FR-005 |
| `/inicio` | autenticada | Saudação + estado vazio | FR-018 |
| qualquer rota inexistente | qualquer | Página "Página não encontrada" com link para `/inicio` | FR-019 |

## Regras do middleware

1. Toda requisição renova a sessão (cookies) quando necessário.
2. Rotas **públicas**: `/entrar`, `/esqueci-senha`, `/auth/*` e arquivos estáticos. Todas as
   demais exigem sessão.
3. Requisição sem sessão a uma rota protegida → `302 /entrar?proximo=<caminho+query>`.
4. Se a sessão expirou (havia cookie, mas ele é inválido), adiciona `&motivo=expirada`. A tela de
   login mostra então "Sua sessão expirou, entre novamente".
5. `proximo` só é aceito se começar com `/`, não começar com `//` e não conter `\`. Caso
   contrário, usa `/inicio` (evita redirect aberto).

## Mensagens de erro (pt-BR)

| Situação | Mensagem |
|----------|----------|
| Credenciais inválidas / usuário inexistente | "E-mail ou senha inválidos." |
| Rate limit (HTTP 429) | "Muitas tentativas. Aguarde alguns minutos e tente novamente." |
| Falha de rede / serviço indisponível | "Não foi possível conectar. Tente novamente." |
| Link de recuperação inválido ou expirado | "Este link é inválido ou expirou. Solicite um novo." |
| Senhas não conferem | "As senhas não conferem." |
