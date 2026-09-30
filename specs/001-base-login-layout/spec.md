# Especificação de Funcionalidade: Base do Projeto (Login, Layout Responsivo e Deploy Inicial)

**Diretório da Funcionalidade**: `specs/001-base-login-layout`

**Criado em**: 2026-09-28

**Status**: Concluído (2026-09-30)

**Entrada**: Descrição do usuário: "Defina a especificação da base do projeto com o login, layout
responsivo e o deploy inicial na vercel e supabase. Defina os padroes para o layout para utilizar
uma template pre pronta que faça sentido para o projeto. Além disso faça as perguntas necessarias
caso precise de maior clareza de como a base deve ser definida"

**Slice**: 1 de 6 (fundação). **Pré-requisitos**: nenhum. **Slices que dependem deste**: todos os
demais (Passageiros, Viagens, Histórico, Pagamentos, Resumo Mensal).

## Esclarecimentos

### Sessão 2026-09-28

- P: Qual método de login? → R: E-mail e senha, com recuperação de senha por e-mail.
- P: Qual template de layout usar como base? → R: Template de dashboard do shadcn/ui (barra
  lateral + componentes de formulário, tabela, cartão e diálogo).
- P: Qual tema visual? → R: Claro/escuro automático conforme o dispositivo, com botão para
  alternar manualmente.

## Cenários de Usuário e Testes *(obrigatório)*

### História de Usuário 1 - Entrar no sistema com segurança (Prioridade: P1)

Como motorista (dono do sistema), quero acessar o site pelo celular ou computador e entrar com
minhas credenciais, para que somente eu veja e gerencie os dados das minhas caronas.

**Por que esta prioridade**: sem acesso autenticado nenhum dado pode ser guardado com segurança
(Princípio VI); todos os slices seguintes dependem disso.

**Teste Independente**: acessar o endereço público do site sem estar logado, ser direcionado para
a tela de login, entrar com a conta do dono e chegar à tela inicial; sair e confirmar que as
páginas internas ficam inacessíveis.

**Cenários de Aceite**:

1. **Dado** que não estou logado, **Quando** acesso qualquer página interna do site, **Então** sou
   levado à tela de login.
2. **Dado** que estou na tela de login, **Quando** informo credenciais válidas, **Então** entro no
   sistema e vejo a tela inicial em até 3 segundos.
3. **Dado** que estou na tela de login, **Quando** informo credenciais inválidas, **Então** vejo uma
   mensagem de erro em português, sem revelar se o e-mail existe, e continuo na tela de login.
4. **Dado** que estou logado, **Quando** fecho o navegador e volto ao site no mesmo dispositivo,
   **Então** continuo logado (sessão persistente) até sair manualmente ou a sessão expirar.
5. **Dado** que estou logado, **Quando** escolho "Sair", **Então** a sessão é encerrada e volto à
   tela de login.
6. **Dado** que esqueci minha senha, **Quando** uso "Esqueci minha senha" na tela de login,
   **Então** recebo por e-mail um link para definir uma nova senha e, após defini-la, consigo
   entrar com ela.

---

### História de Usuário 2 - Navegar em um layout simples e responsivo (Prioridade: P2)

Como motorista, quero uma estrutura de telas limpa e consistente que funcione bem no celular e no
computador, para registrar e consultar caronas com poucos toques em qualquer dispositivo.

**Por que esta prioridade**: define o padrão visual e de navegação que todos os slices seguintes
reutilizam; sem ele cada slice criaria sua própria interface (Princípio IV).

**Teste Independente**: após o login, abrir o site em uma tela de celular (360px) e em uma tela de
computador (1280px ou mais) e verificar que a navegação, o cabeçalho e a tela inicial se adaptam
sem rolagem horizontal e com todos os elementos acessíveis.

**Cenários de Aceite**:

1. **Dado** que estou logado em um celular, **Quando** vejo qualquer página interna, **Então** a
   navegação principal fica fixa na parte inferior da tela, com ícones e rótulos em português.
2. **Dado** que estou logado em um computador, **Quando** vejo qualquer página interna, **Então** a
   navegação principal aparece em uma barra lateral à esquerda e o conteúdo ocupa o restante da tela.
3. **Dado** qualquer largura de tela entre 360px e 1920px, **Quando** navego pelas páginas da base,
   **Então** não há rolagem horizontal e todos os botões têm área de toque de pelo menos 44×44px.
4. **Dado** que acabei de entrar pela primeira vez, **Quando** vejo a tela inicial, **Então** vejo
   uma saudação e um estado vazio explicando que as funcionalidades de caronas serão habilitadas
   em breve, sem links para telas inexistentes.
5. **Dado** que estou em qualquer página interna, **Quando** olho o cabeçalho, **Então** vejo o nome
   do sistema, a identificação da conta logada, o botão de alternar tema e a opção "Sair".
6. **Dado** que meu dispositivo está em modo escuro, **Quando** abro o site pela primeira vez,
   **Então** o site aparece no tema escuro; **Quando** alterno para o tema claro pelo botão,
   **Então** o site muda na hora e mantém o tema claro nas próximas visitas nesse dispositivo.

---

### História de Usuário 3 - Sistema publicado e acessível pela internet (Prioridade: P3)

Como motorista, quero que o site esteja publicado em um endereço público estável, conectado ao
banco de dados de produção, para usá-lo de verdade no dia a dia e receber as próximas
funcionalidades automaticamente a cada atualização.

**Por que esta prioridade**: o Princípio de Fluxo de Desenvolvimento define que um slice só está
concluído quando publicado; este slice estabelece o caminho de publicação usado por todos os
seguintes.

**Teste Independente**: abrir o endereço público em um celular fora da rede de desenvolvimento,
fazer login com a conta do dono e navegar pela tela inicial; publicar uma pequena alteração e
confirmar que ela aparece no endereço público sem passos manuais.

**Cenários de Aceite**:

1. **Dado** que o site foi publicado, **Quando** acesso o endereço público por HTTPS, **Então** vejo
   a tela de login carregada corretamente.
2. **Dado** que uma alteração é enviada ao repositório principal, **Quando** a publicação
   automática termina, **Então** a nova versão fica disponível no endereço público sem
   intervenção manual.
3. **Dado** o repositório do projeto, **Quando** uma pessoa consulta a documentação, **Então**
   encontra a lista de configurações necessárias (sem valores secretos) e o passo a passo para
   publicar o sistema do zero.

---

### Casos de Borda

- O que acontece quando a sessão expira enquanto estou usando o site? → Sou levado à tela de
  login com a mensagem "Sua sessão expirou, entre novamente" e, após entrar, volto à página em que
  estava.
- O que acontece com várias tentativas de login erradas seguidas? → O sistema limita as tentativas
  temporariamente e informa o usuário para aguardar antes de tentar de novo.
- O que acontece se alguém tentar criar uma conta nova? → Não há opção de cadastro público; apenas
  a conta do dono tem acesso (ver Premissas).
- O que acontece sem conexão com a internet ou com o serviço de dados fora do ar? → O site exibe
  uma mensagem clara em português ("Não foi possível conectar. Tente novamente.") em vez de uma
  tela em branco.
- O que acontece em telas muito estreitas (< 360px) ou com zoom de fonte aumentado? → O conteúdo
  quebra linha e continua legível; nenhuma ação fica inacessível.
- O que acontece ao acessar um endereço inexistente? → É exibida uma página "Página não
  encontrada" em português com link para a tela inicial.

## Requisitos *(obrigatório)*

### Requisitos Funcionais

**Autenticação**

- **FR-001**: O sistema MUST exigir autenticação para acessar qualquer página que não seja a tela
  de login, a recuperação de acesso e a página de erro.
- **FR-002**: O sistema MUST autenticar o usuário via e-mail e senha.
- **FR-003**: O sistema MUST NOT oferecer cadastro público de novas contas; a conta do dono é
  criada uma única vez durante a configuração inicial.
- **FR-004**: O sistema MUST manter a sessão ativa entre visitas no mesmo dispositivo até que o
  usuário saia ou a sessão expire.
- **FR-005**: Usuários MUST conseguir sair do sistema a partir de qualquer página interna.
- **FR-006**: O sistema MUST oferecer, a partir da tela de login, a opção "Esqueci minha senha",
  que envia por e-mail um link de uso único para definir uma nova senha.
- **FR-007**: O sistema MUST exibir mensagens de erro de login genéricas, que não revelem se um
  e-mail está cadastrado.
- **FR-008**: O sistema MUST limitar tentativas de login consecutivas malsucedidas.
- **FR-009**: Após expiração de sessão, o sistema MUST redirecionar ao login e, após nova
  autenticação, retornar à página de origem.

**Layout e padrões visuais**

- **FR-010**: O sistema MUST usar como base visual o template de painel administrativo do
  shadcn/ui (dashboard com barra lateral e componentes de formulário, tabela, cartão e diálogo),
  adaptado aos padrões definidos nos requisitos FR-011 a FR-019. O visual MUST ser minimalista:
  fundo neutro, uma única cor de destaque para ações principais e tipografia sem serifa legível
  em celular.
- **FR-011**: O layout MUST ser mobile-first: em telas menores que 768px, a navegação principal
  fica em uma barra fixa inferior; a partir de 768px, em uma barra lateral à esquerda.
- **FR-012**: O layout MUST ter um cabeçalho com nome do sistema ("Caronas Já"), identificação da
  conta logada, botão de alternar tema e a ação "Sair".
- **FR-013**: A navegação MUST exibir apenas itens de telas já existentes; cada slice futuro
  adiciona seu próprio item (inicialmente apenas "Início").
- **FR-014**: O sistema MUST fornecer um conjunto padrão de componentes de interface reutilizáveis
  pelos próximos slices: botões (primário, secundário, perigo), campos de formulário com rótulo e
  mensagem de erro, cartões, tabela que vira lista de cartões no celular, estado vazio, indicador
  de carregamento, aviso temporário (toast) e diálogo de confirmação.
- **FR-015**: Todas as áreas clicáveis MUST ter no mínimo 44×44px e o contraste de texto MUST
  atender WCAG AA.
- **FR-016**: Todos os textos da interface MUST estar em português do Brasil; o sistema MUST
  disponibilizar formatação padrão de datas (`DD/MM/AAAA`, `HH:mm`), valores (`R$ 1.234,56`) e fuso
  `America/Sao_Paulo` para uso dos próximos slices.
- **FR-017**: O sistema MUST oferecer tema claro e escuro: por padrão segue a preferência do
  dispositivo, e o usuário MUST poder alternar manualmente por um botão no cabeçalho. A escolha
  manual MUST ser lembrada no mesmo dispositivo, e ambos os temas MUST atender o contraste
  WCAG AA.
- **FR-018**: A tela inicial MUST exibir uma saudação e um estado vazio que explique o que virá
  nos próximos slices, sem links quebrados.
- **FR-019**: O sistema MUST exibir páginas de erro amigáveis em português para "página não
  encontrada" e "falha de conexão".

**Publicação e ambiente**

- **FR-020**: O sistema MUST estar publicado em um endereço público acessível por HTTPS.
- **FR-021**: Cada alteração integrada ao ramo principal do repositório MUST ser publicada
  automaticamente, sem passos manuais.
- **FR-022**: O sistema MUST estar conectado ao ambiente de dados de produção, com proteção de
  acesso por dono habilitada desde o primeiro dado armazenado.
- **FR-023**: O repositório MUST conter um arquivo de exemplo com todas as configurações
  necessárias (sem valores secretos) e um guia em português de configuração e publicação do zero.
- **FR-024**: Nenhuma chave secreta MUST ficar exposta no site publicado ou versionada no
  repositório.

### Entidades Principais

- **Usuário (Motorista)**: o dono do sistema e única conta com acesso. Atributos: e-mail,
  nome de exibição, data de criação. Todos os dados futuros (passageiros, viagens, pagamentos)
  pertencem a este usuário.
- **Sessão**: representa o acesso autenticado de um usuário em um dispositivo. Atributos: usuário,
  início, expiração.

## Critérios de Sucesso *(obrigatório)*

### Resultados Mensuráveis

- **SC-001**: O dono consegue sair da tela de login e chegar à tela inicial em menos de 30
  segundos, no celular e no computador.
- **SC-002**: 100% das páginas internas bloqueiam o acesso de visitantes não autenticados
  (verificado tentando acessar cada rota sem login).
- **SC-003**: A tela inicial carrega em até 3 segundos em uma conexão móvel 4G comum.
- **SC-004**: Nenhuma página apresenta rolagem horizontal nas larguras de 360px, 768px, 1280px e
  1920px.
- **SC-005**: Uma alteração integrada ao ramo principal fica disponível no endereço público em até
  10 minutos, sem intervenção manual.
- **SC-006**: Uma pessoa que segue apenas o guia do repositório consegue publicar uma cópia
  funcional do sistema em menos de 1 hora.
- **SC-007**: O custo mensal de infraestrutura é R$ 0,00 no uso pessoal previsto.

## Premissas

- O sistema tem um único usuário (o motorista dono); não há cadastro público nem múltiplos
  motoristas (constituição, Restrições de Domínio).
- A conta do dono é criada manualmente uma única vez durante a configuração inicial, conforme o
  guia do repositório.
- O acesso ocorre por navegadores modernos de celular (Android/iOS) e computador; não há
  aplicativo nativo nem funcionamento offline neste slice.
- A publicação usa as plataformas definidas na constituição (Princípio III), nos planos gratuitos.
- Um domínio próprio é opcional; o endereço padrão fornecido pela plataforma de hospedagem é
  suficiente para este slice.
- Os itens de navegação de Passageiros, Viagens, Histórico, Pagamentos e Resumo são adicionados
  pelos respectivos slices, não por este.
- O template visual escolhido é adaptado (cores, textos em pt-BR, remoção de páginas de exemplo)
  e não usado com o conteúdo de demonstração original.
