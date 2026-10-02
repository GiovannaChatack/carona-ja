-- Slice 005, fatia B: chave PIX exibida nas cobranças.
-- Ver specs/005-controle-pagamentos/data-model.md e research.md §7.
-- A política de update de perfis (slice 001) já permite ao dono gravar a própria chave.
alter table public.perfis
  add column chave_pix text
    constraint perfis_chave_pix_valida
      check (chave_pix is null or (chave_pix = btrim(chave_pix) and char_length(chave_pix) between 1 and 77));

comment on column public.perfis.chave_pix is
  'Chave PIX exibida nas cobranças; nula = não cadastrada.';
