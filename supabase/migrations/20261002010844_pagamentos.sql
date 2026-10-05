-- Slice 005, fatia A: situação de pagamento das participações.
-- Ver specs/005-controle-pagamentos/data-model.md e research.md §1–§6.
-- Aditiva: participações existentes ficam pendentes (pago_em nulo); nenhum backfill.

-- 1. Dia do pagamento (date, não timestamptz: o motorista informa um dia; research §1).
alter table public.viagem_passageiros add column pago_em date;

comment on column public.viagem_passageiros.pago_em is
  'Dia do pagamento em São Paulo; nulo = pendente.';

-- 2. Pendências por passageiro.
create index viagem_passageiros_pendentes
  on public.viagem_passageiros (passageiro_id)
  where pago_em is null;

-- 3. Regras de pagamento no banco (research §2). Um update de várias linhas é um único
--    comando: se uma linha falhar, nenhuma é alterada (FR-010).
--    Erros: CJ007 valor de participação paga; CJ008 data inválida; CJ009 não cobrável.
--    Desfazer (pago_em → nulo) nunca é bloqueado. Não há regra de delete (research §2).
create function public.validar_pagamento()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_realizada_em timestamptz;
  v_arquivada_em timestamptz;
begin
  -- Participação paga não muda de valor.
  if tg_op = 'UPDATE' then
    if old.pago_em is not null and new.pago_em is not null
       and new.valor_centavos <> old.valor_centavos then
      raise exception using errcode = 'CJ007', message = 'participacao_paga';
    end if;
  end if;

  -- Só valida a data quando ela é preenchida ou alterada.
  if new.pago_em is null then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if new.pago_em is not distinct from old.pago_em then
      return new;
    end if;
  end if;

  select realizada_em, arquivada_em into v_realizada_em, v_arquivada_em
  from public.viagens
  where id = new.viagem_id;

  if v_arquivada_em is not null or new.valor_centavos = 0 then
    raise exception using errcode = 'CJ009', message = 'participacao_nao_cobravel';
  end if;

  if new.pago_em > (now() at time zone 'America/Sao_Paulo')::date then
    raise exception using errcode = 'CJ008', message = 'data_pagamento_futura';
  end if;

  if new.pago_em < (v_realizada_em at time zone 'America/Sao_Paulo')::date then
    raise exception using errcode = 'CJ008', message = 'data_pagamento_antes_da_viagem';
  end if;

  return new;
end;
$$;

comment on function public.validar_pagamento() is
  'Valida pago_em e protege o valor de participações pagas (CJ007–CJ009).';

-- 4. Dispara a validação.
create trigger viagem_passageiros_validar_pagamento
  before insert or update of pago_em, valor_centavos on public.viagem_passageiros
  for each row execute function public.validar_pagamento();

-- 5. editar_viagem redefinida (research §4): igual à do slice 003, mais o bloqueio CJ007.
-- Mesmas regras de registrar_viagem, com as exceções da edição (FR-019):
--   - o trajeto atual pode continuar, mesmo arquivado; outro trajeto precisa estar ativo;
--   - os passageiros já vinculados podem continuar, mesmo arquivados; os novos precisam estar ativos;
--   - a verificação de duplicidade ignora a própria viagem.
-- As participações são alteradas por diferença (research §3): as que continuam mantêm o id, para
-- não perder o pago_em.
-- Erros: CJ001 duplicada no dia; CJ002 trajeto; CJ003 passageiro; CJ004 participações;
-- CJ005 data no futuro; CJ006 viagem inexistente, de outra conta ou arquivada;
-- CJ007 participação paga removida ou com valor alterado (detail = nome do passageiro).
create or replace function public.editar_viagem(
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
  v_nome_pago text;
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

  -- 6a. Participação paga não sai da viagem nem muda de valor (slice 005, FR-025).
  --     O detail leva o nome do passageiro para a mensagem no formulário.
  select p.nome into v_nome_pago
  from public.viagem_passageiros vp
  join public.passageiros p on p.id = vp.passageiro_id
  where vp.viagem_id = p_viagem_id
    and vp.pago_em is not null
    and not exists (
      select 1
      from jsonb_to_recordset(p_participacoes) as x(passageiro_id uuid, valor_centavos integer)
      where x.passageiro_id = vp.passageiro_id
        and x.valor_centavos = vp.valor_centavos
    )
  limit 1;

  if v_nome_pago is not null then
    raise exception using
      errcode = 'CJ007',
      message = 'participacao_paga',
      detail = v_nome_pago;
  end if;

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

-- 6. Uma linha por participação, com os dados da viagem, do trajeto e do passageiro (research §6).
create view public.participacoes_detalhe
  with (security_invoker = true)
as
select
  vp.id,
  vp.viagem_id,
  vp.passageiro_id,
  vp.valor_centavos,
  vp.pago_em,
  v.realizada_em,
  v.sentido,
  v.arquivada_em,
  t.origem,
  t.destino,
  p.nome as passageiro_nome,
  p.arquivado_em as passageiro_arquivado_em
from public.viagem_passageiros vp
join public.viagens v on v.id = vp.viagem_id
join public.trajetos t on t.id = v.trajeto_id
join public.passageiros p on p.id = vp.passageiro_id;

comment on view public.participacoes_detalhe is
  'Participações com a viagem, o trajeto e o passageiro; base das telas de pagamentos.';

-- 7. Pendências por passageiro: a única definição de dívida (FR-003, FR-004).
--    Pendente = não paga, com valor > 0 e de viagem ativa.
create view public.pendencias_passageiros
  with (security_invoker = true)
as
select
  p.id as passageiro_id,
  p.nome,
  p.telefone,
  p.arquivado_em,
  count(vp.id)::integer as quantidade_pendentes,
  sum(vp.valor_centavos)::integer as total_pendente_centavos
from public.passageiros p
join public.viagem_passageiros vp on vp.passageiro_id = p.id
join public.viagens v on v.id = vp.viagem_id
where vp.pago_em is null
  and vp.valor_centavos > 0
  and v.arquivada_em is null
group by p.id;

comment on view public.pendencias_passageiros is
  'Passageiros com pendências (não pagas, valor > 0, viagem ativa), com quantidade e total.';
