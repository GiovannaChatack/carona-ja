// Dados da conta exibidos no AppShell (Sidebar e menu da conta).
export type Usuario = {
  nome: string
  email: string
  // ISO 8601 (perfis.criado_em); ausente se o perfil ainda não existir.
  membroDesde?: string
}
