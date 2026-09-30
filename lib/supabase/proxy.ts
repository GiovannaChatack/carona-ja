import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { env } from '@/lib/env'

// Rotas acessíveis sem sessão (contracts/rotas.md, "Regras do middleware").
// "/" e "/sair" passam direto: a página e o route handler decidem o que fazer.
function ehRotaPublica(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/sair' ||
    pathname === '/entrar' ||
    pathname === '/esqueci-senha' ||
    pathname === '/auth' ||
    pathname.startsWith('/auth/')
  )
}

// O cookie de sessão pode vir dividido em partes: sb-<ref>-auth-token.0, .1...
const COOKIE_SESSAO = /^sb-.+-auth-token(\.\d+)?$/

// Renova a sessão (cookies) e protege as rotas internas. Chamado por proxy.ts na raiz.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
      },
    },
  })

  // Não colocar código entre createServerClient e getUser(): getUser() valida e renova a sessão.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname, search } = request.nextUrl

  if (!user && !ehRotaPublica(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/entrar'
    url.search = ''
    // Sem a sessão de recuperação criada por /auth/confirmar, o link já não vale.
    if (pathname === '/redefinir-senha') {
      url.searchParams.set('erro', 'link-invalido')
      return redirecionar(url, response)
    }
    url.searchParams.set('proximo', `${pathname}${search}`)
    if (request.cookies.getAll().some(({ name }) => COOKIE_SESSAO.test(name))) {
      url.searchParams.set('motivo', 'expirada')
    }
    return redirecionar(url, response)
  }

  if (user && pathname === '/entrar') {
    const url = request.nextUrl.clone()
    url.pathname = '/inicio'
    url.search = ''
    return redirecionar(url, response)
  }

  return response
}

// Mantém os cookies renovados pelo Supabase também na resposta de redirecionamento.
function redirecionar(url: URL, origem: NextResponse) {
  const redirect = NextResponse.redirect(url)
  origem.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
  return redirect
}
