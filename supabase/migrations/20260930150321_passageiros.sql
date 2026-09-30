-- Slice 002: passageiros do motorista.
-- Ver specs/002-registro-passageiros/data-model.md.

-- 1. Tabela de passageiros: pessoas que pegam carona (sem conta no sistema).
create table public.passageiros (
  id uuid primary key default gen_random_uuid(),
  motorista_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  nome text not null
    check (nome = btrim(nome) and char_length(nome) between 1 and 80),
  -- Só dígitos: DDD (sem zero) + 8 dígitos (fixo) ou 9 + 8 dígitos (celular).
  telefone text not null
    check (telefone ~ '^[1-9]{2}(9[0-9]{8}|[0-9]{8})$'),
  valor_padrao_centavos integer not null
    check (valor_padrao_centavos between 0 and 999999),
  observacao text
    check (
      observacao is null
      or (observacao = btrim(observacao) and char_length(observacao) between 1 and 200)
    ),
  -- null = ativo; preenchido = arquivado naquele instante.
  arquivado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.passageiros is
  'Passageiros do motorista, com o valor padrão cobrado por trajeto (em centavos).';

-- 2. Mantém atualizado_em (função criada na migração de perfis).
create trigger passageiros_definir_atualizado_em
  before update on public.passageiros
  for each row execute function public.definir_atualizado_em();

-- 3. Nome único entre os ativos do mesmo motorista, sem diferenciar maiúsculas (FR-006).
--    Também bloqueia reativar um arquivado cujo nome colida com um ativo.
create unique index passageiros_nome_ativo_unico
  on public.passageiros (motorista_id, lower(nome))
  where arquivado_em is null;

-- 4. Lista de arquivados por nome.
create index passageiros_motorista_nome
  on public.passageiros (motorista_id, nome);

-- 5. RLS: cada motorista só enxerga e altera os próprios passageiros.
alter table public.passageiros enable row level security;

create policy "passageiros: dono lê os próprios registros"
  on public.passageiros
  for select
  to authenticated
  using (motorista_id = (select auth.uid()));

create policy "passageiros: dono insere os próprios registros"
  on public.passageiros
  for insert
  to authenticated
  with check (motorista_id = (select auth.uid()));

create policy "passageiros: dono atualiza os próprios registros"
  on public.passageiros
  for update
  to authenticated
  using (motorista_id = (select auth.uid()))
  with check (motorista_id = (select auth.uid()));

create policy "passageiros: dono exclui os próprios registros"
  on public.passageiros
  for delete
  to authenticated
  using (motorista_id = (select auth.uid()));
