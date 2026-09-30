-- Slice 001: perfis do motorista (saudação e cabeçalho).
-- Ver specs/001-base-login-layout/data-model.md, Parte 1.

-- 1. Trigger genérico que mantém atualizado_em (reutilizado pelas próximas tabelas).
create or replace function public.definir_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

-- 2. Tabela de perfis: um por usuário.
create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome_exibicao text not null
    check (char_length(trim(nome_exibicao)) between 1 and 60),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.perfis is 'Dados de exibição do motorista (um por usuário do Auth).';

-- 3. Mantém atualizado_em.
create trigger perfis_definir_atualizado_em
  before update on public.perfis
  for each row execute function public.definir_atualizado_em();

-- 4. Cria o perfil automaticamente quando um usuário é criado no Auth.
--    Nome padrão = parte do e-mail antes do @, limitada a 60 caracteres.
create or replace function public.criar_perfil_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id, nome_exibicao)
  values (
    new.id,
    left(coalesce(nullif(trim(split_part(new.email, '@', 1)), ''), 'Motorista'), 60)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 5. Dispara a criação do perfil.
create trigger criar_perfil_apos_novo_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_novo_usuario();

-- 6. Backfill: usuários criados antes desta migração.
insert into public.perfis (id, nome_exibicao)
select
  u.id,
  left(coalesce(nullif(trim(split_part(u.email, '@', 1)), ''), 'Motorista'), 60)
from auth.users u
on conflict (id) do nothing;

-- 7. RLS: cada usuário só enxerga e altera o próprio perfil.
alter table public.perfis enable row level security;

-- 8. Políticas de leitura e atualização. Sem políticas de insert/delete (9):
--    o perfil nasce pelo trigger e some junto com o usuário.
create policy "perfis: dono lê o próprio perfil"
  on public.perfis
  for select
  to authenticated
  using (id = (select auth.uid()));

create policy "perfis: dono atualiza o próprio perfil"
  on public.perfis
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
