-- Slice 003, fatia C: edição atômica de uma viagem.
-- Ver specs/003-registro-viagens/data-model.md (Funções SQL) e research.md §3 e §8.

-- Mesmas regras de registrar_viagem, com as exceções da edição (FR-019):
--   - o trajeto atual pode continuar, mesmo arquivado; outro trajeto precisa estar ativo;
--   - os passageiros já vinculados podem continuar, mesmo arquivados; os novos precisam estar ativos;
--   - a verificação de duplicidade ignora a própria viagem.
-- As participações são alteradas por diferença (research §3): as que continuam mantêm o id, para
-- o slice de Pagamentos não perder o pago_em.
-- Erros: CJ001 duplicada no dia; CJ002 trajeto; CJ003 passageiro; CJ004 participações;
-- CJ005 data no futuro; CJ006 viagem inexistente, de outra conta ou arquivada.
create function public.editar_viagem(
  p_viagem_id uuid,
  p_trajeto_id uuid,
  p_sentido text,
  p_data_hora_local timestamp,
  p_participacoes jsonb,
  p_confirmar_duplicada boolean default false
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_trajeto_atual uuid;
  v_arquivada_em timestamptz;
  v_realizada_em timestamptz;
  v_enviados integer;
  v_encontrados integer;
begin
  -- 1. Trava a viagem; a RLS esconde as de outras contas.
  select trajeto_id, arquivada_em into v_trajeto_atual, v_arquivada_em
  from public.viagens
  where id = p_viagem_id
  for update;

  if not found or v_arquivada_em is not null then
    raise exception using errcode = 'CJ006', message = 'viagem_nao_encontrada';
  end if;

  -- 2. Hora de São Paulo → instante; no máximo 1 dia no futuro (FR-011).
  v_realizada_em := p_data_hora_local at time zone 'America/Sao_Paulo';
  if v_realizada_em is null or v_realizada_em > now() + interval '1 day' then
    raise exception using errcode = 'CJ005', message = 'data_futura';
  end if;

  -- 3. Trajeto: o atual (mesmo arquivado) ou outro trajeto ativo do motorista.
  if p_trajeto_id is distinct from v_trajeto_atual and not exists (
    select 1 from public.trajetos
    where id = p_trajeto_id and arquivado_em is null
  ) then
    raise exception using errcode = 'CJ002', message = 'trajeto_invalido';
  end if;

  if p_sentido is null or p_sentido not in ('ida', 'volta') then
    raise exception using errcode = 'CJ004', message = 'sentido_invalido';
  end if;

  -- 4. Ao menos uma participação, com valores na faixa.
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

  -- Passageiros distintos do motorista: ativos ou já vinculados a esta viagem.
  select count(distinct p.id) into v_encontrados
  from jsonb_to_recordset(p_participacoes) as x(passageiro_id uuid, valor_centavos integer)
  join public.passageiros p on p.id = x.passageiro_id
  where p.arquivado_em is null
     or exists (
       select 1 from public.viagem_passageiros vp
       where vp.viagem_id = p_viagem_id and vp.passageiro_id = p.id
     );

  if v_encontrados <> v_enviados then
    raise exception using errcode = 'CJ003', message = 'passageiro_invalido';
  end if;

  -- 5. Aviso de outra viagem ativa no mesmo trajeto, sentido e dia de São Paulo (FR-015).
  if not coalesce(p_confirmar_duplicada, false) and exists (
    select 1 from public.viagens
    where id <> p_viagem_id
      and trajeto_id = p_trajeto_id
      and sentido = p_sentido
      and arquivada_em is null
      and (realizada_em at time zone 'America/Sao_Paulo')::date = p_data_hora_local::date
  ) then
    raise exception using
      errcode = 'CJ001',
      message = 'viagem_duplicada',
      detail = to_char(p_data_hora_local::date, 'DD/MM/YYYY');
  end if;

  -- 6. Atualiza a viagem.
  update public.viagens
  set trajeto_id = p_trajeto_id,
      sentido = p_sentido,
      realizada_em = v_realizada_em
  where id = p_viagem_id;

  -- 7. Participações por diferença: saem as desmarcadas, mudam os valores alterados, entram as novas.
  delete from public.viagem_passageiros vp
  where vp.viagem_id = p_viagem_id
    and not exists (
      select 1
      from jsonb_to_recordset(p_participacoes) as x(passageiro_id uuid, valor_centavos integer)
      where x.passageiro_id = vp.passageiro_id
    );

  update public.viagem_passageiros vp
  set valor_centavos = x.valor_centavos
  from jsonb_to_recordset(p_participacoes) as x(passageiro_id uuid, valor_centavos integer)
  where vp.viagem_id = p_viagem_id
    and vp.passageiro_id = x.passageiro_id
    and vp.valor_centavos <> x.valor_centavos;

  insert into public.viagem_passageiros (viagem_id, passageiro_id, valor_centavos)
  select p_viagem_id, x.passageiro_id, x.valor_centavos
  from jsonb_to_recordset(p_participacoes) as x(passageiro_id uuid, valor_centavos integer)
  where not exists (
    select 1 from public.viagem_passageiros vp
    where vp.viagem_id = p_viagem_id and vp.passageiro_id = x.passageiro_id
  );
end;
$$;

comment on function public.editar_viagem(uuid, uuid, text, timestamp, jsonb, boolean) is
  'Edita uma viagem ativa e as participações (por diferença) em uma única transação, sob a RLS.';

revoke execute on function public.editar_viagem(uuid, uuid, text, timestamp, jsonb, boolean)
  from public, anon;
grant execute on function public.editar_viagem(uuid, uuid, text, timestamp, jsonb, boolean)
  to authenticated;
