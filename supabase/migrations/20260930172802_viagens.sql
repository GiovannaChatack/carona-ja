-- Slice 003, fatia B: viagens e participações dos passageiros.
-- Ver specs/003-registro-viagens/data-model.md e research.md §2–§9.

-- 1. Alvo da FK composta de viagem_passageiros (research §4). Aditiva: não muda o slice 002.
alter table public.passageiros
  add constraint passageiros_id_motorista_unico unique (id, motorista_id);

-- 2. Viagens: uma carona em um trajeto, em um único sentido.
create table public.viagens (
  id uuid primary key default gen_random_uuid(),
  motorista_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  trajeto_id uuid not null,
  sentido text not null check (sentido in ('ida', 'volta')),
  realizada_em timestamptz not null,
  -- null = ativa; preenchido = arquivada (desconsiderada em totais e pendências).
  arquivada_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint viagens_id_motorista_unico unique (id, motorista_id),
  -- FK composta: o trajeto precisa ser do mesmo motorista (a FK ignora a RLS; research §4).
  -- Sem "on delete": no action bloqueia excluir um trajeto com viagens (research §5).
  constraint viagens_trajeto_fk foreign key (trajeto_id, motorista_id)
    references public.trajetos (id, motorista_id)
);

comment on table public.viagens is
  'Viagens do motorista: trajeto, sentido (ida/volta) e data. O total vem de viagens_resumo.';

-- 3. Participações: o passageiro na viagem, com o valor cobrado dele nesta viagem.
create table public.viagem_passageiros (
  id uuid primary key default gen_random_uuid(),
  motorista_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  viagem_id uuid not null,
  passageiro_id uuid not null,
  -- Cópia do valor padrão no momento do registro, editável (FR-020).
  valor_centavos integer not null check (valor_centavos between 0 and 999999),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint viagem_passageiros_viagem_fk foreign key (viagem_id, motorista_id)
    references public.viagens (id, motorista_id) on delete cascade,
  -- no action: bloqueia excluir um passageiro com viagens (FR-023).
  constraint viagem_passageiros_passageiro_fk foreign key (passageiro_id, motorista_id)
    references public.passageiros (id, motorista_id),
  constraint viagem_passageiros_unico unique (viagem_id, passageiro_id)
);

comment on table public.viagem_passageiros is
  'Participação de cada passageiro em uma viagem, com o valor cobrado (em centavos).';

-- 4. Mantém atualizado_em (função criada na migração de perfis).
create trigger viagens_definir_atualizado_em
  before update on public.viagens
  for each row execute function public.definir_atualizado_em();

create trigger viagem_passageiros_definir_atualizado_em
  before update on public.viagem_passageiros
  for each row execute function public.definir_atualizado_em();

-- 5. Índices: lista das mais recentes, duplicidade/FK do trajeto e FK do passageiro.
create index viagens_ativas_recentes
  on public.viagens (motorista_id, realizada_em desc)
  where arquivada_em is null;

create index viagens_trajeto_sentido
  on public.viagens (motorista_id, trajeto_id, sentido, realizada_em);

create index viagem_passageiros_passageiro
  on public.viagem_passageiros (passageiro_id);

-- 6. RLS: cada motorista só enxerga e altera os próprios registros.
--    O delete em viagens existe só para a limpeza dos testes (research §15).
alter table public.viagens enable row level security;

create policy "viagens: dono lê os próprios registros"
  on public.viagens
  for select
  to authenticated
  using (motorista_id = (select auth.uid()));

create policy "viagens: dono insere os próprios registros"
  on public.viagens
  for insert
  to authenticated
  with check (motorista_id = (select auth.uid()));

create policy "viagens: dono atualiza os próprios registros"
  on public.viagens
  for update
  to authenticated
  using (motorista_id = (select auth.uid()))
  with check (motorista_id = (select auth.uid()));

create policy "viagens: dono exclui os próprios registros"
  on public.viagens
  for delete
  to authenticated
  using (motorista_id = (select auth.uid()));

alter table public.viagem_passageiros enable row level security;

create policy "viagem_passageiros: dono lê os próprios registros"
  on public.viagem_passageiros
  for select
  to authenticated
  using (motorista_id = (select auth.uid()));

create policy "viagem_passageiros: dono insere os próprios registros"
  on public.viagem_passageiros
  for insert
  to authenticated
  with check (motorista_id = (select auth.uid()));

create policy "viagem_passageiros: dono atualiza os próprios registros"
  on public.viagem_passageiros
  for update
  to authenticated
  using (motorista_id = (select auth.uid()))
  with check (motorista_id = (select auth.uid()));

create policy "viagem_passageiros: dono exclui os próprios registros"
  on public.viagem_passageiros
  for delete
  to authenticated
  using (motorista_id = (select auth.uid()));

-- 7. Resumo de cada viagem: única fonte do total (FR-013, SC-003).
--    security_invoker aplica a RLS das tabelas de origem.
create view public.viagens_resumo
  with (security_invoker = true)
as
select
  v.id,
  v.trajeto_id,
  v.sentido,
  v.realizada_em,
  v.arquivada_em,
  v.criado_em,
  v.atualizado_em,
  t.origem,
  t.destino,
  t.arquivado_em as trajeto_arquivado_em,
  count(vp.id)::integer as quantidade_passageiros,
  coalesce(sum(vp.valor_centavos), 0)::integer as total_centavos
from public.viagens v
join public.trajetos t on t.id = v.trajeto_id
left join public.viagem_passageiros vp on vp.viagem_id = v.id
group by v.id, t.id;

comment on view public.viagens_resumo is
  'Uma linha por viagem, com o trajeto, a quantidade de passageiros e o total em centavos.';

-- 8. Registro atômico da viagem e das participações (research §2, §6–§8).
--    Erros: CJ001 duplicada no dia; CJ002 trajeto; CJ003 passageiro; CJ004 participações;
--    CJ005 data no futuro.
create function public.registrar_viagem(
  p_trajeto_id uuid,
  p_sentido text,
  p_data_hora_local timestamp,
  p_participacoes jsonb,
  p_confirmar_duplicada boolean default false
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_realizada_em timestamptz;
  v_enviados integer;
  v_encontrados integer;
  v_viagem_id uuid;
begin
  -- 1. Hora de São Paulo → instante; no máximo 1 dia no futuro (FR-011).
  v_realizada_em := p_data_hora_local at time zone 'America/Sao_Paulo';
  if v_realizada_em is null or v_realizada_em > now() + interval '1 day' then
    raise exception using errcode = 'CJ005', message = 'data_futura';
  end if;

  -- 2. Trajeto ativo do motorista (a RLS esconde os de outras contas).
  if not exists (
    select 1 from public.trajetos
    where id = p_trajeto_id and arquivado_em is null
  ) then
    raise exception using errcode = 'CJ002', message = 'trajeto_invalido';
  end if;

  if p_sentido is null or p_sentido not in ('ida', 'volta') then
    raise exception using errcode = 'CJ004', message = 'sentido_invalido';
  end if;

  -- 3. Ao menos uma participação, com valores na faixa.
  if p_participacoes is null or jsonb_typeof(p_participacoes) <> 'array' then
    raise exception using errcode = 'CJ004', message = 'participacoes_invalidas';
  end if;

  select count(*) into v_enviados
  from jsonb_to_recordset(p_participacoes) as x(passageiro_id uuid, valor_centavos integer);

  if v_enviados = 0 or exists (
    select 1
    from jsonb_to_recordset(p_participacoes) as x(passageiro_id uuid, valor_centavos integer)
    where x.valor_centavos is null or x.valor_centavos not between 0 and 999999
  ) then
    raise exception using errcode = 'CJ004', message = 'participacoes_invalidas';
  end if;

  -- Passageiros distintos, ativos e do motorista; repetidos ou nulos não batem a contagem.
  select count(distinct p.id) into v_encontrados
  from jsonb_to_recordset(p_participacoes) as x(passageiro_id uuid, valor_centavos integer)
  join public.passageiros p on p.id = x.passageiro_id and p.arquivado_em is null;

  if v_encontrados <> v_enviados then
    raise exception using errcode = 'CJ003', message = 'passageiro_invalido';
  end if;

  -- 4. Aviso de viagem ativa no mesmo trajeto, sentido e dia de São Paulo (FR-015).
  if not coalesce(p_confirmar_duplicada, false) and exists (
    select 1 from public.viagens
    where trajeto_id = p_trajeto_id
      and sentido = p_sentido
      and arquivada_em is null
      and (realizada_em at time zone 'America/Sao_Paulo')::date = p_data_hora_local::date
  ) then
    raise exception using
      errcode = 'CJ001',
      message = 'viagem_duplicada',
      detail = to_char(p_data_hora_local::date, 'DD/MM/YYYY');
  end if;

  -- 5. Grava a viagem e as participações (motorista_id = auth.uid() por padrão).
  insert into public.viagens (trajeto_id, sentido, realizada_em)
  values (p_trajeto_id, p_sentido, v_realizada_em)
  returning id into v_viagem_id;

  insert into public.viagem_passageiros (viagem_id, passageiro_id, valor_centavos)
  select v_viagem_id, x.passageiro_id, x.valor_centavos
  from jsonb_to_recordset(p_participacoes) as x(passageiro_id uuid, valor_centavos integer);

  return v_viagem_id;
end;
$$;

comment on function public.registrar_viagem(uuid, text, timestamp, jsonb, boolean) is
  'Registra uma viagem com as participações em uma única transação, sob a RLS do motorista.';

revoke execute on function public.registrar_viagem(uuid, text, timestamp, jsonb, boolean)
  from public, anon;
grant execute on function public.registrar_viagem(uuid, text, timestamp, jsonb, boolean)
  to authenticated;
