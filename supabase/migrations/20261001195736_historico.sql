-- Slice 004: histórico de viagens (somente leitura).
-- Ver specs/004-historico-viagens/data-model.md e research.md §1–§3.
-- Só cria duas funções; nenhuma tabela, view ou função existente é alterada (research §2).

-- 1. Linhas do histórico: viagens ativas do período, mais recentes primeiro.
--    O período chega como datas do calendário de São Paulo, inclusivas (FR-004).
create function public.historico_viagens(
  p_inicio date,
  p_fim date,
  p_passageiro_id uuid default null,
  p_trajeto_id uuid default null,
  p_sentido text default null,
  p_limite integer default 21
)
returns table (
  id uuid,
  realizada_em timestamptz,
  criado_em timestamptz,
  sentido text,
  trajeto_id uuid,
  origem text,
  destino text,
  passageiros text[],
  total_centavos integer,
  valor_passageiro_centavos integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    v.id,
    v.realizada_em,
    v.criado_em,
    v.sentido,
    v.trajeto_id,
    t.origem,
    t.destino,
    coalesce(array_agg(p.nome order by p.nome) filter (where p.id is not null), '{}'::text[]),
    coalesce(sum(vp.valor_centavos), 0)::integer,
    case
      when p_passageiro_id is null then null
      else max(vp.valor_centavos) filter (where vp.passageiro_id = p_passageiro_id)
    end
  from public.viagens v
  join public.trajetos t on t.id = v.trajeto_id
  left join public.viagem_passageiros vp on vp.viagem_id = v.id
  left join public.passageiros p on p.id = vp.passageiro_id
  where v.arquivada_em is null
    and v.realizada_em >= (p_inicio::timestamp at time zone 'America/Sao_Paulo')
    and v.realizada_em < ((p_fim + 1)::timestamp at time zone 'America/Sao_Paulo')
    and (p_trajeto_id is null or v.trajeto_id = p_trajeto_id)
    and (p_sentido is null or v.sentido = p_sentido)
    and (p_passageiro_id is null or exists (
      select 1 from public.viagem_passageiros x
      where x.viagem_id = v.id and x.passageiro_id = p_passageiro_id
    ))
  group by v.id, t.id
  order by v.realizada_em desc, v.criado_em desc
  limit p_limite;
$$;

comment on function public.historico_viagens(date, date, uuid, uuid, text, integer) is
  'Viagens ativas do período (datas de São Paulo), com passageiros e totais; filtros opcionais.';

revoke execute on function public.historico_viagens(date, date, uuid, uuid, text, integer)
  from public, anon;
grant execute on function public.historico_viagens(date, date, uuid, uuid, text, integer)
  to authenticated;

-- 2. Resumo do mesmo resultado: sempre uma linha (FR-013, FR-014).
--    Sem passageiro, soma os totais das viagens; com passageiro, só os valores dele.
create function public.historico_resumo(
  p_inicio date,
  p_fim date,
  p_passageiro_id uuid default null,
  p_trajeto_id uuid default null,
  p_sentido text default null
)
returns table (
  quantidade integer,
  total_centavos bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with filtradas as (
    select v.id
    from public.viagens v
    where v.arquivada_em is null
      and v.realizada_em >= (p_inicio::timestamp at time zone 'America/Sao_Paulo')
      and v.realizada_em < ((p_fim + 1)::timestamp at time zone 'America/Sao_Paulo')
      and (p_trajeto_id is null or v.trajeto_id = p_trajeto_id)
      and (p_sentido is null or v.sentido = p_sentido)
      and (p_passageiro_id is null or exists (
        select 1 from public.viagem_passageiros x
        where x.viagem_id = v.id and x.passageiro_id = p_passageiro_id
      ))
  )
  select
    (select count(*) from filtradas)::integer,
    coalesce((
      select sum(vp.valor_centavos)
      from public.viagem_passageiros vp
      join filtradas f on f.id = vp.viagem_id
      where p_passageiro_id is null or vp.passageiro_id = p_passageiro_id
    ), 0)::bigint;
$$;

comment on function public.historico_resumo(date, date, uuid, uuid, text) is
  'Quantidade e total cobrado (centavos) das viagens de historico_viagens com os mesmos filtros.';

revoke execute on function public.historico_resumo(date, date, uuid, uuid, text)
  from public, anon;
grant execute on function public.historico_resumo(date, date, uuid, uuid, text)
  to authenticated;
