<!--
Sync Impact Report
- Versão: (template sem versão) → 1.0.0
- Princípios definidos (antes eram placeholders):
  - [PRINCIPLE_1_NAME] → I. Documentação em Português do Brasil
  - [PRINCIPLE_2_NAME] → II. Vertical Slices Independentes (NÃO NEGOCIÁVEL)
  - [PRINCIPLE_3_NAME] → III. Simplicidade e Deploy Enxuto (Supabase + Vercel)
  - [PRINCIPLE_4_NAME] → IV. Interface Simples e Responsiva (Mobile-First)
  - [PRINCIPLE_5_NAME] → V. Integridade dos Dados de Viagens e Pagamentos
- Seções adicionadas: VI. Privacidade e Segurança dos Dados; Restrições Técnicas e de Domínio;
  Fluxo de Desenvolvimento
- Seções removidas: nenhuma
- Templates: nenhum template foi alterado (lidos em tempo de execução pelos comandos dependentes)
- TODOs pendentes: nenhum
-->

# Caronas Já Constitution

## Core Principles

### I. Documentação em Português do Brasil

Toda documentação e todo artefato de planejamento do projeto (constituição, specs, planos,
tarefas, checklists, README, mensagens na interface) MUST ser escritos em português do Brasil.
Identificadores de código (nomes de variáveis, funções, tabelas) MAY usar inglês ou português,
desde que o padrão escolhido seja consistente em todo o projeto e registrado no plano técnico.
Textos exibidos ao usuário MUST estar em pt-BR, com datas no formato `DD/MM/AAAA` e valores em
Real (`R$ 1.234,56`).

**Justificativa**: o usuário final e o responsável pelo projeto trabalham em pt-BR; documentação
no mesmo idioma reduz ambiguidade entre sessões de implementação.

### II. Vertical Slices Independentes (NÃO NEGOCIÁVEL)

O planejamento MUST ser organizado em vertical slices: cada fatia entrega uma funcionalidade
completa de ponta a ponta (banco de dados → lógica → interface) que pode ser implementada,
testada e publicada em uma sessão de trabalho separada.

- Cada slice MUST ter critérios de aceite próprios e ser demonstrável sozinho após o deploy.
- Cada slice MUST declarar explicitamente de quais slices anteriores depende; dependências
  circulares são proibidas.
- Um slice MUST NOT deixar o sistema quebrado ou com telas sem uso caso os slices seguintes
  nunca sejam implementados.
- Migrações de banco MUST pertencer ao slice que as utiliza, e não a uma fase "de infraestrutura"
  genérica, exceto a fundação mínima (projeto, autenticação, layout base).

**Justificativa**: permite evoluir o sistema em sessões curtas e isoladas, com valor entregue a
cada etapa e sem retrabalho entre sessões.

### III. Simplicidade e Deploy Enxuto (Supabase + Vercel)

A solução MUST usar Supabase (banco Postgres, autenticação e API) e Vercel (hospedagem do
frontend) como únicas plataformas de infraestrutura. O projeto MUST NOT usar servidores
próprios, containers ou serviços pagos adicionais sem emenda a esta constituição.

- Preferir recursos nativos do Supabase (RLS, views, funções SQL) a um backend customizado.
- Novas dependências MUST ser justificadas no plano; na dúvida, aplicar YAGNI.
- O deploy MUST ser automático a partir do repositório (push → Vercel) e reproduzível com as
  variáveis de ambiente documentadas.

**Justificativa**: é um sistema pessoal; custo, manutenção e complexidade operacional devem ficar
próximos de zero.

### IV. Interface Simples e Responsiva (Mobile-First)

A interface MUST ser utilizável tanto em celular quanto em computador, projetada primeiro para
telas de celular (a partir de 360px de largura) e expandida para telas maiores.

- As ações do dia a dia (registrar uma viagem, marcar um pagamento) MUST ser concluídas em poucos
  toques, sem exigir rolagem horizontal da página.
- Tabelas de histórico MUST ter uma apresentação legível em celular (ex.: cartões ou colunas
  reduzidas) sem perder informações essenciais.
- Alvos de toque MUST ter no mínimo 44×44px; contraste de texto MUST atender WCAG AA.

**Justificativa**: o registro das caronas acontece principalmente no celular, logo após a viagem;
a consulta e a conferência podem acontecer no computador.

### V. Integridade dos Dados de Viagens e Pagamentos

Os dados financeiros e temporais são a fonte de verdade do sistema e MUST ser confiáveis.

- Valores monetários MUST ser armazenados como inteiros em centavos (BRL), nunca como ponto
  flutuante.
- Cada viagem MUST registrar data e hora (`timestamptz`), e os passageiros vinculados MUST ter o
  valor cobrado registrado individualmente por viagem.
- O status de pagamento (pago/pendente) MUST ser rastreável por passageiro e por viagem, com a
  data em que o pagamento foi confirmado.
- Resumos (total de viagens e valor recebido por mês) MUST ser derivados dos registros
  existentes, nunca digitados manualmente, e MUST bater com o histórico detalhado.
- Agregações mensais MUST usar o fuso horário `America/Sao_Paulo`.
- A exclusão de registros com pagamentos associados MUST exigir confirmação explícita.

**Justificativa**: o objetivo central é saber quem deve e quanto foi recebido; erros de
arredondamento, de fuso ou divergências entre resumo e histórico invalidam o sistema.

### VI. Privacidade e Segurança dos Dados

O sistema MUST exigir autenticação (Supabase Auth) para qualquer acesso aos dados. Todas as
tabelas MUST ter Row Level Security (RLS) habilitada, restringindo o acesso ao dono dos registros.
Chaves secretas (ex.: `service_role`) MUST NOT ser expostas no frontend nem versionadas no
repositório.

**Justificativa**: o sistema guarda nomes de pessoas e valores financeiros; mesmo sendo de uso
pessoal, esses dados não podem ficar públicos.

## Restrições Técnicas e de Domínio

- **Hospedagem**: frontend na Vercel; banco de dados, autenticação e API no Supabase (plano
  gratuito como meta).
- **Stack do frontend**: definida no plano técnico do primeiro slice, compatível com deploy
  direto na Vercel e com o cliente oficial do Supabase.
- **Banco de dados**: esquema versionado por migrações SQL no repositório; nenhuma alteração
  manual de esquema em produção sem migração correspondente.
- **Moeda e localidade**: BRL, locale `pt-BR`, fuso `America/Sao_Paulo`.
- **Usuário-alvo**: um motorista (o dono do sistema) gerenciando seus passageiros; recursos
  multiusuário ou multi-motorista estão fora de escopo sem emenda.
- **Configuração**: variáveis de ambiente documentadas em um arquivo de exemplo (`.env.example`).

## Fluxo de Desenvolvimento

- Cada funcionalidade segue o fluxo Spec Kit: `/speckit-specify` → `/speckit-clarify` (quando
  houver ambiguidade) → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`.
- Cada spec MUST corresponder a um único vertical slice (Princípio II) e referenciar seus slices
  pré-requisitos.
- Todo plano MUST incluir uma verificação de conformidade com esta constituição (Constitution
  Check) antes de gerar tarefas.
- Regras de cálculo (valores por passageiro, totais mensais, status de pagamento) MUST ter testes
  automatizados; a interface MUST ser verificada manualmente em largura de celular e de desktop
  antes de encerrar o slice.
- Um slice só é considerado concluído quando está publicado na Vercel e funcionando com o
  Supabase de produção.

## Governance

Esta constituição prevalece sobre quaisquer outras práticas ou preferências do projeto. Em caso
de conflito entre um plano/spec e esta constituição, a constituição vence ou deve ser emendada.

- **Emendas**: propostas via `/speckit-constitution`, com descrição da mudança, justificativa e
  impacto nos slices já planejados; o Sync Impact Report registra o que mudou.
- **Versionamento** (SemVer):
  - MAJOR: remoção ou redefinição incompatível de princípios ou regras de governança.
  - MINOR: novo princípio ou seção, ou ampliação material de orientação existente.
  - PATCH: esclarecimentos, redação e correções sem mudança de significado.
- **Conformidade**: todo `plan.md` MUST passar pelo Constitution Check; exceções MUST ser
  justificadas na seção de rastreamento de complexidade do plano. A revisão de conformidade
  ocorre ao final de cada slice.

**Version**: 1.0.0 | **Ratified**: 2026-09-28 | **Last Amended**: 2026-09-28
