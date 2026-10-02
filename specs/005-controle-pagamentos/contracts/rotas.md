# Contrato: Rotas e Telas de Pagamentos e Cobrança

Todas as rotas ficam em `app/(app)/` (exigem login, slice 001) e reutilizam os componentes dos
slices 001–003: `ResponsiveTable` (tabela ≥ 768px, cartões abaixo), `EmptyState`,
`ConfirmDialog`, `AvisoUrl`, `Badge`, `Card`, `Button`. Textos em pt-BR, valores com
`formatCurrency`, datas com `formatDate`. Alvos de toque ≥ 44px; sem rolagem horizontal de 360px
a 1920px (SC-008).

## Navegação

- `components/layout/nav-items.ts`: item `{ rotulo: 'Pagamentos', href: '/pagamentos', icone:
  Wallet }`, depois de "Histórico" (research §13). Fica ativo também em `/pagamentos/...`.

## `/pagamentos`: pendências (fatia A)

- Cabeçalho "Pagamentos" e link "Chave PIX" (ícone `Settings`) para `/pagamentos/configuracoes`
  (fatia B; antes disso o link não existe).
- Cartão de resumo: "Total a receber" com a soma geral e "N passageiros com pendências".
- `ResponsiveTable` com uma linha por passageiro de `pendencias_passageiros`, do maior para o
  menor total (empate: nome): Nome (+ `Badge` "Arquivado"), "N viagens", total devido. A linha
  inteira leva a `/pagamentos/[passageiroId]`.
- Estado vazio: `EmptyState` "Ninguém está devendo" / "Todas as viagens ativas estão pagas."
- Toasts por `AvisoUrl`: nenhum próprio.

## `/pagamentos/[passageiroId]`: pagamentos do passageiro (fatia A; cobrança na fatia B)

- `passageiroId` inválido, inexistente ou de outra conta → `notFound()`.
- Link de volta "Pagamentos"; título = nome do passageiro (+ `Badge` "Arquivado"); telefone
  formatado.
- Cartão "Total devido" com o valor e "N viagens pendentes".
- Botão "Cobrar pelo WhatsApp" (fatia B) → `/pagamentos/[id]/cobrar`; sem pendências, botão
  desabilitado com o texto "Nada a cobrar" (FR-015).
- **Seção "Pendentes"** (componente cliente `ListaPendentes`):
  - viagens pendentes, da mais antiga para a mais recente: caixa de marcação, `DD/MM/AAAA`,
    "Ida"/"Volta", percurso no sentido da viagem, valor;
  - "Selecionar todas" / "Limpar seleção";
  - rodapé fixo na tela quando há seleção: "N selecionadas · R$ x", campo "Data do pagamento"
    (`type="date"`, padrão hoje em São Paulo, `max` hoje, `min` o dia da viagem mais recente
    selecionada) e botão "Marcar como pagas";
  - botão "Recebi tudo" (fora da seleção): `ConfirmDialog` "Marcar todas como pagas?" com "N
    viagens · R$ x", a data e o botão "Marcar como pagas";
  - sem pendências: "Nenhum valor pendente" e total `R$ 0,00`.
- **Seção "Pagas"**: viagens pagas (de viagens ativas), da data de pagamento mais recente para a
  mais antiga (empate: data da viagem): `DD/MM/AAAA`, sentido, percurso, valor e "Pago em
  DD/MM/AAAA"; mostra 20 e "Carregar mais" por URL (`?pagas=40`, padrão da lista de viagens).
  Cada linha tem:
  - "Alterar data": diálogo com o campo de data e "Salvar";
  - "Desfazer": `ConfirmDialog` "Desfazer pagamento?" / "A viagem de DD/MM/AAAA volta a ficar
    pendente." / "Desfazer".
- Erros das ações aparecem com `role="alert"` junto da ação; a seleção é mantida (FR-028).
- Toasts (`AvisoUrl` ou retorno da action): "N viagens marcadas como pagas", "Pagamento
  desfeito", "Data do pagamento alterada", e "N viagens já estavam pagas" quando for o caso.

## `/pagamentos/[passageiroId]/cobrar`: cobrança (fatia B)

- Sem chave PIX cadastrada → redireciona para
  `/pagamentos/configuracoes?voltar=/pagamentos/[id]/cobrar&aviso=pix-necessaria` (FR-023).
- Sem pendências → redireciona para `/pagamentos/[id]` (o botão já estava desabilitado).
- Componente cliente `Cobranca`:
  - lista das viagens pendentes, todas marcadas, em ordem cronológica, com caixa de marcação,
    data, sentido e valor; total recalculado na hora (FR-016);
  - prévia da mensagem (`montarMensagemCobranca`) em um bloco com `whitespace-pre-wrap`,
    `break-words`, selecionável;
  - "Abrir no WhatsApp": `<a href={linkWhatsApp(...)} target="_blank" rel="noopener
    noreferrer">` com aparência de botão primário (FR-018);
  - "Copiar mensagem": copia e mostra o toast "Mensagem copiada" (FR-019);
  - nenhuma viagem marcada → ambos desabilitados, com "Selecione ao menos uma viagem.";
  - link "Voltar" para `/pagamentos/[id]` e link "Alterar chave PIX".
- Nada é gravado nesta tela (FR-020).

## `/pagamentos/configuracoes`: chave PIX (fatia B)

- Formulário com o campo "Chave PIX" (texto, `maxLength` 77, `autoComplete="off"`), dica
  "CPF, CNPJ, telefone, e-mail ou chave aleatória, como aparecerá na mensagem." e botão "Salvar".
- Com `?aviso=pix-necessaria`: aviso no topo "Cadastre a chave PIX para gerar cobranças."
- `?voltar=` só é aceito no formato `/pagamentos/<uuid>/cobrar`; após salvar, redireciona para
  ele ou, sem ele, para `/pagamentos`, com o toast "Chave PIX salva".
- Erros no campo: "Informe a chave PIX." / "A chave PIX pode ter no máximo 77 caracteres."

## Ajustes em telas existentes

### `/passageiros/[id]` (fatia A)

- Cartão "Pagamentos" depois dos dados cadastrais: "Total devido: R$ x" (ou `R$ 0,00`) e link "Ver
  pagamentos" → `/pagamentos/[id]` (FR-013). O botão "Ver histórico" (slice 004)
  permanece como está.

### `/viagens/[id]/editar` (fatia A)

- Passageiros com participação paga aparecem marcados, com caixa e valor desabilitados e a
  etiqueta "Pago em DD/MM/AAAA" (FR-025). O erro `CJ007` aparece no campo "passageiros".

### `/viagens/[id]` (fatia A: arquivar; fatia C: situação)

- **Fatia A**: o diálogo de arquivar, quando há participações pagas, muda para "Arquivar viagem
  com pagamentos?" / "N passageiro(s) já pagaram esta viagem. Esses valores deixarão de ser
  contados. Os pagamentos ficam guardados e voltam se você reativar a viagem." / "Arquivar mesmo
  assim" (FR-024).
- **Fatia C**: cada passageiro mostra `Badge` "Pago em DD/MM/AAAA", "Pendente" ou "Sem cobrança";
  em viagem ativa, os pendentes têm o botão "Marcar como pago", que abre um diálogo com a data
  (padrão hoje, `min` o dia da viagem) e "Confirmar". Toast "Pagamento registrado" (FR-014).

## Diálogos de confirmação (resumo)

| Diálogo | Título | Botão |
|---------|--------|-------|
| Recebi tudo | Marcar todas como pagas? | Marcar como pagas |
| Desfazer | Desfazer pagamento? | Desfazer |
| Alterar data | Alterar data do pagamento | Salvar |
| Marcar na viagem | Marcar pagamento de {Nome} | Confirmar |
| Arquivar com pagas | Arquivar viagem com pagamentos? | Arquivar mesmo assim |
