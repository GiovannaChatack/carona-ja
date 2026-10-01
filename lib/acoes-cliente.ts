// Falha de conexão nas server actions (FR-025).
// Sem rede, a chamada da action rejeita no navegador (TypeError do fetch) e o erro iria para o
// error.tsx, apagando o formulário. Este invólucro devolve um estado de erro no lugar, para a
// tela mostrar a mensagem e manter o que foi preenchido. Os demais erros seguem normalmente.

export const ERRO_CONEXAO = 'Não foi possível salvar. Tente novamente.'

export function tratarFalhaDeConexao<E, P extends unknown[]>(
  acao: (estado: E, ...parametros: P) => Promise<E>,
  aoFalhar: (...parametros: P) => E,
): (estado: E, ...parametros: P) => Promise<E> {
  return async (estado, ...parametros) => {
    try {
      return await acao(estado, ...parametros)
    } catch (erro) {
      if (erro instanceof TypeError) return aoFalhar(...parametros)
      throw erro
    }
  }
}
