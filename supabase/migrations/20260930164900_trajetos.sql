-- Slice 003, fatia A: trajetos do motorista.
-- Ver specs/003-registro-viagens/data-model.md.

-- 1. Tabela de trajetos: pares origem → destino que o motorista percorre.
create table public.trajetos (
  id uuid primary key default gen_random_uuid(),
  motorista_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  origem text not null
    check (origem = btrim(origem) and char_length(origem) between 1 and 80),
  destino text not null
    check (destino = btrim(destino) and char_length(destino) between 1 and 80),
  -- null = ativo; preenchido = arquivado naquele instante.
  arquivado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  -- Origem e destino diferentes, sem diferenciar maiúsculas (FR-002).
  constraint trajetos_origem_diferente_destino check (lower(origem) <> lower(destino)),
  -- Alvo das FKs compostas de viagens (research §4).
  constraint trajetos_id_motorista_unico unique (id, motorista_id)
);

comment on table public.trajetos is
  'Trajetos do motorista: pares origem → destino usados ao registrar viagens.';

-- 2. Mantém atualizado_em (função criada na migração de perfis).
create trigger trajetos_definir_atualizado_em
  before update on public.trajetos
  for each row execute function public.definir_atualizado_em();

-- 3. Trajeto único entre os ativos do mesmo motorista, sem diferenciar maiúsculas (FR-003).
--    Também bloqueia reativar um arquivado que colida com um ativo.
create unique index trajetos_ativo_unico
  on public.trajetos (motorista_id, lower(origem), lower(destino))
  where arquivado_em is null;

-- 4. RLS: cada motorista só enxerga e altera os próprios trajetos.
alter table public.trajetos enable row level security;

create policy "trajetos: dono lê os próprios registros"
  on public.trajetos
  for select
  to authenticated
  using (motorista_id = (select auth.uid()));

create policy "trajetos: dono insere os próprios registros"
  on public.trajetos
  for insert
  to authenticated
  with check (motorista_id = (select auth.uid()));

create policy "trajetos: dono atualiza os próprios registros"
  on public.trajetos
  for update
  to authenticated
  using (motorista_id = (select auth.uid()))
  with check (motorista_id = (select auth.uid()));

create policy "trajetos: dono exclui os próprios registros"
  on public.trajetos
  for delete
  to authenticated
  using (motorista_id = (select auth.uid()));
