import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { useAuth } from '@/auth/AuthContext'
import { CONTACTOS, ESCOLA, MENU } from './conteudo'
import './site.css'

const ICONES: Record<string, string> = {
  seta: 'M5 12h14M13 6l6 6-6 6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  fechar: 'M6 6l12 12M18 6 6 18',
  tel: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  pin: 'M12 21s7-6.2 7-11.5a7 7 0 1 0-14 0C5 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  chat: 'M4 20l1.4-4.2A8 8 0 1 1 8.5 19z',
  face: 'M15 3h-2a4 4 0 0 0-4 4v3H6v4h3v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h2z',
  insta: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17.5 6.5h.01',
  anterior: 'M15 5l-7 7 7 7',
  seguinte: 'M9 5l7 7-7 7',
}

export const Ic = ({ n, size = 20 }: { n: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={ICONES[n]} />
  </svg>
)

/** Título do separador do navegador, enquanto a página estiver aberta. */
export function useTitulo(titulo: string) {
  useEffect(() => {
    const antes = document.title
    document.title = `${titulo} · ${ESCOLA}`
    return () => { document.title = antes }
  }, [titulo])
}

/** Topo das páginas interiores: título à esquerda e fotografia à direita. */
export function TopoPagina({ etiqueta, titulo, texto, foto, alt }: { etiqueta: string; titulo: string; texto: ReactNode; foto: string; alt: string }) {
  return (
    <section className="s-topo">
      <div className="s-caixa s-topo-g">
        <div>
          <p className="s-etiqueta">{etiqueta}</p>
          <h1>{titulo}</h1>
          <p className="s-topo-t">{texto}</p>
        </div>
        <img src={foto} alt={alt} width="800" height="530" />
      </div>
    </section>
  )
}

/** Faixa final a convidar à pré-inscrição. */
export function Convite() {
  return (
    <section className="s-convite">
      <div className="s-caixa s-convite-g">
        <div>
          <h2>Venha fazer parte da nossa família</h2>
          <p>Preencha a pré-inscrição: a coordenação analisa o pedido e contacta a família para uma reunião.</p>
        </div>
        <Link className="s-bt s-bt-sol" to="/candidatura">Fazer a pré-inscrição <Ic n="seta" /></Link>
      </div>
    </section>
  )
}

export default function SiteLayout() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [aberto, setAberto] = useState(false)
  useEffect(() => { setAberto(false) }, [pathname])

  return (
    <div className="site">
      <a className="s-saltar" href="#conteudo-site">Saltar para o conteúdo</a>
      <header className="s-cab">
        <div className="s-caixa s-cab-g">
          <Link to="/" className="s-logo"><img src="/site/logo-horizontal.png" alt={`${ESCOLA}, página inicial`} width="672" height="117" /></Link>
          <button type="button" className="s-menu-bt" aria-expanded={aberto} aria-controls="s-nav" aria-label={aberto ? 'Fechar o menu' : 'Abrir o menu'} onClick={() => setAberto((v) => !v)}>
            <Ic n={aberto ? 'fechar' : 'menu'} size={24} />
          </button>
          <nav id="s-nav" className={`s-nav ${aberto ? 'aberto' : ''}`} aria-label="Principal">
            {MENU.map(([to, nome]) => <NavLink key={to} to={to}>{nome}</NavLink>)}
            <Link className="s-entrar" to={user ? '/' : '/login'}>{user ? 'Abrir a aplicação' : 'Entrar'}</Link>
          </nav>
        </div>
        <div className="s-fita" aria-hidden="true"><i /><i /><i /><i /><i /></div>
      </header>

      <main id="conteudo-site"><Outlet /></main>

      <footer className="s-rodape">
        <div className="s-caixa s-rodape-g">
          <div>
            <img src="/site/logo.png" alt={ESCOLA} width="480" height="285" className="s-rodape-logo" />
            <p>Educar é criar laços e dar afectos.</p>
          </div>
          <nav aria-label="Páginas">
            <h2>Páginas</h2>
            <Link to="/">Início</Link>
            {MENU.map(([to, nome]) => <Link key={to} to={to}>{nome}</Link>)}
            <Link to="/login">Portal do encarregado</Link>
          </nav>
          <div>
            <h2>Fale connosco</h2>
            <ul>
              <li><a href={CONTACTOS.whatsapp} target="_blank" rel="noreferrer"><Ic n="chat" size={18} /> {CONTACTOS.telefone}</a></li>
              <li><a href={`mailto:${CONTACTOS.email}`}><Ic n="mail" size={18} /> {CONTACTOS.email}</a></li>
              <li><a href={CONTACTOS.facebook.url} target="_blank" rel="noreferrer"><Ic n="face" size={18} /> {CONTACTOS.facebook.nome}</a></li>
              <li><a href={CONTACTOS.instagram.url} target="_blank" rel="noreferrer"><Ic n="insta" size={18} /> {CONTACTOS.instagram.nome}</a></li>
              <li><a href={CONTACTOS.mapa} target="_blank" rel="noreferrer"><Ic n="pin" size={18} /> {CONTACTOS.morada}</a></li>
            </ul>
          </div>
        </div>
        <p className="s-direitos">© {new Date().getFullYear()} {ESCOLA}. Todos os direitos reservados.</p>
      </footer>
      <ScrollRestoration />
    </div>
  )
}
