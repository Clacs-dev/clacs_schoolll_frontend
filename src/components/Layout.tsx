import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { AnimatePresence, m } from 'motion/react'
import { useAuth } from '@/auth/AuthContext'
import { nameOf, pick, type Row } from '@/lib/data'
import { estadoCiclo, nomeCiclo, useCicloActual } from '@/lib/ciclos'
import { isActivo } from '@/lib/academic'
import { AuthImage } from './AuthImage'
import { Pagina, T_NORMAL, T_RAPIDO } from './Motion'

/* ---------------------------------------------------------------- ícones do menu (traço simples) */
const PATHS: Record<string, string> = {
  home: 'M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  gestao: 'M4 6h16M4 12h16M4 18h16',
  painel: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  aluno: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21c0-4 4-6 8-6s8 2 8 6',
  financeiro: 'M3 7h18v12H3zM3 11h18M7 15h3',
  docente: 'M3 5h18v11H3zM8 21l4-5 4 5M7 9h6',
  academico: 'M2 9l10-5 10 5-10 5zM6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5M22 9v6',
  secretaria: 'M3 7h6l2 2h10v10H3zM3 7V5h6l2 2',
  comunicacao: 'M4 5h16v11H8l-4 4z',
  admin: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z',
  config: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-2-4-2 1-2-1V5h-4v2l-2 1-2-1-2 4 2 1v2l-2 1 2 4 2-1 2 1v2h4v-2l2-1 2 1 2-4-2-1z',
  sair: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  tema: 'M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z',
}
export const Icone = ({ n, size = 18 }: { n: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={PATHS[n]} />
  </svg>
)

/* ---------------------------------------------------------------- menu (cada entrada: caminho, nome, módulo de permissão) */
// [caminho, nome, módulo da permissão, visibilidade]. Visibilidade "naoProfessor": escondido a quem só tem o perfil
// professor (ele precisa de "cadastro: ver" para ler os alunos das suas turmas, mas não gere a secretaria);
// "soProfessor": só para esse utilizador (o mesmo ecrã noutro grupo).
type Item = [string, string, string?, ('naoProfessor' | 'soProfessor')?]
type Grupo = { group: string; icon: string; items: Item[] }

// Organizado pelos serviços da escola. Um mesmo ecrã com separadores (ex.: /academico) pode aparecer em
// vários grupos, cada um a abrir o separador desse serviço (?tab=…).
export const NAV: Grupo[] = [
  { group: 'Direcção', icon: 'painel', items: [
    ['/gestao', 'Gestão geral', undefined, 'naoProfessor'], ['/painel', 'Painel da direcção', 'painel'], ['/alertas', 'Alertas', 'painel'],
    ['/relatorios', 'Relatórios', 'painel'], ['/assistente', 'Assistente', 'painel'],
  ] },
  { group: 'Pedagógico', icon: 'docente', items: [
    ['/academico', 'Registo académico', 'academico'], ['/plano-actividades', 'Plano de actividade', 'pedagogico'],
    ['/turmas', 'Turmas', 'cadastro'], ['/horarios', 'Horários', 'pedagogico'], ['/cargas-horarias', 'Cargas horárias', 'academico'],
    ['/avaliacoes', 'Avaliações e notas', 'pedagogico'],
    ['/pautas', 'Pautas', 'pedagogico'], ['/aulas', 'Aulas', 'pedagogico'], ['/assiduidade', 'Assiduidade', 'pedagogico'], ['/assiduidade-professores', 'Assiduidade dos professores', 'academico', 'naoProfessor'],
    ['/registo-diario', 'Registo diário', 'pedagogico'], ['/ocorrencias', 'Ocorrências', 'pedagogico', 'soProfessor'],
  ] },
  { group: 'Secretaria', icon: 'secretaria', items: [
    ['/secretaria', 'Painel da secretaria', 'cadastro', 'naoProfessor'], ['/candidaturas', 'Candidaturas', 'candidaturas'], ['/matriculas', 'Matrículas e renovações', 'cadastro', 'naoProfessor'],
    ['/alunos', 'Processos dos alunos', 'cadastro', 'naoProfessor'], ['/encarregados', 'Encarregados', 'cadastro', 'naoProfessor'],
    ['/pedidos', 'Pedidos e declarações', 'cadastro', 'naoProfessor'], ['/ocorrencias', 'Ocorrências', 'pedagogico', 'naoProfessor'], ['/saude', 'Saúde escolar', 'saude'],
    ['/transporte', 'Transporte', 'transporte'],
  ] },
  { group: 'Financeiro', icon: 'financeiro', items: [
    ['/cobrancas', 'Propinas e cobranças', 'propinas'], ['/pagamentos', 'Pagamentos', 'propinas'], ['/acordos', 'Acordos de pagamento', 'propinas'], ['/orcamento', 'Orçamento e despesas', 'propinas'],
    ['/refeitorio', 'Refeitório e serviços', 'refeitorio'], ['/catalogo', 'Serviços e preços', 'propinas'],
    ['/primavera', 'Integração Primavera', 'primavera'],
  ] },
  { group: 'Comunicação', icon: 'comunicacao', items: [
    ['/mensagens', 'Mensagens e comunicados', 'comunicacao'], ['/regras', 'Regras e modelos', 'comunicacao'],
  ] },
  { group: 'Administrador', icon: 'admin', items: [
    ['/ciclos', 'Ciclos académicos', 'academico', 'naoProfessor'],
    ['/utilizadores', 'Utilizadores', 'utilizadores'], ['/perfis', 'Perfis e permissões', 'utilizadores'],
    ['/definicoes', 'Definições da escola', 'academico', 'naoProfessor'], ['/academico?tab=salas', 'Salas', 'academico', 'naoProfessor'],
    ['/auditoria', 'Auditoria', 'utilizadores'], ['/importacao', 'Importação de dados', 'importacao'],
  ] },
]

/** O utilizador vê o módulo? (admin vê tudo; os restantes pelas permissões "modulo:ver" do /auth/me). */
/** Só tem o perfil professor (nenhum outro, como secretaria ou coordenação). */
export function useSoProfessor() {
  const { user } = useAuth()
  const perfis: string[] = Array.isArray(user?.perfis) ? user!.perfis : []
  return perfis.length > 0 && perfis.every((p) => p === 'professor')
}

/** Permissão concreta, ex.: permite('academico:criar'). O perfil admin pode tudo. */
export function usePermite() {
  const { user } = useAuth()
  const perms: string[] = Array.isArray(user?.permissoes) ? user!.permissoes : []
  const admin = (Array.isArray(user?.perfis) ? user!.perfis : []).includes('admin')
  return (perm: string) => admin || perms.includes(perm)
}

export function usePode() {
  const { user } = useAuth()
  const perms: string[] = Array.isArray(user?.permissoes) ? user!.permissoes : []
  const admin = (Array.isArray(user?.perfis) ? user!.perfis : []).includes('admin')
  return (modulo?: string) => !modulo || admin || perms.includes(`${modulo}:ver`)
}

export function useTheme() {
  const [t, setT] = useState<string>(() => {
    try { return localStorage.getItem('clacs.theme') || '' } catch { return '' }
  })
  useEffect(() => {
    if (t) document.documentElement.dataset.theme = t
    else delete document.documentElement.dataset.theme
    try { t ? localStorage.setItem('clacs.theme', t) : localStorage.removeItem('clacs.theme') } catch { /* sem storage */ }
  }, [t])
  const toggle = () => {
    const dark = t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches)
    setT(dark ? 'light' : 'dark')
  }
  return toggle
}

/** Logótipo horizontal da escola (fundo transparente, pensado para fundos azul-escuros). */
export const Logo = () => <img className="marca-logo" src="/site/logo-horizontal.png" alt="Talatona Kids" width="672" height="117" />


export const nomeEscola = (user: Row | null) => String(pick(user, 'estabelecimento.nome') ?? 'Talatona Kids')

/** A entrada do menu corresponde ao endereço actual? Com "?tab=…", conta também o separador. */
function activo(to: string, pathname: string, search: string) {
  const [path, query] = to.split('?')
  if (!query) return pathname === path || pathname.startsWith(`${path}/`)
  if (pathname !== path) return false
  const actual = new URLSearchParams(search)
  // Sem separador no endereço, o ecrã abre o 1.º: corresponde à 1.ª entrada do menu com esse caminho.
  if (!actual.size) return NAV.flatMap((g) => g.items).find(([t]) => t.startsWith(`${path}?`))?.[0] === to
  return [...new URLSearchParams(query)].every(([k, v]) => actual.get(k) === v)
}

function grupoDe(pathname: string, search: string) {
  return NAV.find((g) => g.items.some(([to, , , v]) => v !== 'soProfessor' && activo(to, pathname, search)))?.group
}

function Chev({ open }: { open: boolean }) {
  return (
    <svg className="chev" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" style={{ transform: open ? 'rotate(90deg)' : undefined }}>
      <path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Fotografia (ou iniciais) do utilizador. */
export function Avatar({ user, size = 36 }: { user: Row | null; size?: number }) {
  const nome = nameOf(user) || 'Utilizador'
  const iniciais = nome.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase()
  return (
    <span className="avatar-sm" style={{ width: size, height: size }}>
      <AuthImage src={pick(user, 'foto_url')} alt={`Fotografia de ${nome}`} fallback={iniciais} />
    </span>
  )
}

/**
 * Ciclo académico em que se trabalha, como a empresa no CLACS GeoModel: tudo o que a plataforma mostra e regista
 * é desse ciclo. Ponto verde = ciclo activo; âmbar = outro ciclo; cinzento = encerrado (só consulta).
 */
function SeletorCiclo() {
  const { ciclos, ciclo, activo, mudar, encerrado } = useCicloActual()
  if (!ciclo) return null
  const tom = encerrado ? 'encerrado' : activo && ciclo.id === activo.id ? '' : 'outro'
  return (
    <label className={`ciclo-sel ${tom}`} title="Ciclo académico em que está a trabalhar">
      <span className="ciclo-dot" aria-hidden="true" />
      <span className="sr-only">Ciclo académico</span>
      <select value={String(ciclo.id)} onChange={(e) => mudar(e.target.value)}>
        {ciclos.map((c) => (
          <option key={c.id} value={String(c.id)}>
            Ciclo {nomeCiclo(c)}{isActivo(c) ? ' · activo' : estadoCiclo(c) === 'encerrado' ? ' · encerrado' : ''}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Faixa por baixo do topo quando o ciclo escolhido está encerrado: só se pode consultar. */
function AvisoEncerrado() {
  const { ciclo, encerrado } = useCicloActual()
  if (!encerrado || !ciclo) return null
  return (
    <div className="ciclo-aviso" role="status">
      O ciclo <b>{nomeCiclo(ciclo)}</b> está encerrado: só consulta, excepto receber pagamentos das dívidas deste ciclo. Para registar ou alterar outros dados, escolha outro ciclo no topo.
    </div>
  )
}

function Topo({ onMenu, ciclo }: { onMenu: () => void; ciclo?: boolean }) {
  const { user, logout } = useAuth()
  const toggleTheme = useTheme()
  return (
    <header className="topo">
      <button type="button" className="topo-btn" onClick={onMenu} aria-label="Mostrar ou esconder o menu">
        <Icone n="gestao" size={22} />
      </button>
      <span className="grow" />
      {ciclo && <SeletorCiclo />}
      <button type="button" className="topo-btn" onClick={toggleTheme} aria-label="Alternar tema claro/escuro" title="Alternar tema">
        <Icone n="tema" />
      </button>
      <NavLink to="/conta" className="topo-user" title="O meu perfil">
        <Avatar user={user} />
        <b>{nameOf(user) || 'Utilizador'}</b>
      </NavLink>
      <button type="button" className="topo-btn" onClick={logout} aria-label="Terminar sessão" title="Terminar sessão">
        <Icone n="sair" />
      </button>
    </header>
  )
}

function Lado({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <aside className={`side ${open ? 'open' : ''}`} aria-label="Navegação principal">
      <div className="brand">
        <b>Sistema de Gestão Escolar</b>
      </div>
      {children}
    </aside>
  )
}

export function Layout() {
  const loc = useLocation()
  const pode = usePode()
  const soProfessor = useSoProfessor()
  const visivel = ([, , m, v]: Item) => pode(m) && (v === 'naoProfessor' ? !soProfessor : v === 'soProfessor' ? soProfessor : true)
  const [aberto, setAberto] = useState(false)          // menu no telemóvel
  const [escondido, setEscondido] = useState(false)    // menu recolhido no computador
  const [grupoAberto, setGrupoAberto] = useState<string | undefined>(() => grupoDe(loc.pathname, loc.search))
  useEffect(() => { setAberto(false) }, [loc.pathname])
  useEffect(() => { const g = grupoDe(loc.pathname, loc.search); if (g) setGrupoAberto(g) }, [loc.pathname, loc.search])
  const menu = () => (matchMedia('(max-width: 900px)').matches ? setAberto(true) : setEscondido((v) => !v))
  const nl = ({ isActive }: { isActive: boolean }) => `nl ${isActive ? 'active' : ''}`

  return (
    <div className={`app ${escondido ? 'side-off' : ''}`}>
      <AnimatePresence>
        {aberto && <m.div className="scrim" key="scrim" onClick={() => setAberto(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={T_RAPIDO} />}
      </AnimatePresence>
      <Lado open={aberto}>
        <NavLink to="/inicio" className={nl}><Icone n="home" /> Home</NavLink>
        <hr className="side-hr" />
        <div className="side-titulo">Serviços</div>
        {NAV.map((g) => {
          const itens = g.items.filter(visivel)
          if (!itens.length) return null
          const expandido = grupoAberto === g.group
          return (
            <div className="nav-group" key={g.group}>
              <button type="button" className={`nav-g-btn ${expandido ? 'expanded' : ''}`} aria-expanded={expandido}
                onClick={() => setGrupoAberto(expandido ? undefined : g.group)}>
                <span className="nav-g-l"><Icone n={g.icon} /> {g.group}</span>
                <Chev open={expandido} />
              </button>
              <AnimatePresence initial={false}>
                {expandido && (
                  <m.nav aria-label={g.group} className="nav-sub" key="sub"
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={T_NORMAL}>
                    {itens.map(([to, l]) => (
                      // className em função: o NavLink não junta o "active" dele, que só olha para o caminho
                      <NavLink key={to} to={to} className={() => `nl ${activo(to, loc.pathname, loc.search) ? 'active' : ''}`}>{l}</NavLink>
                    ))}
                  </m.nav>
                )}
              </AnimatePresence>
            </div>
          )
        })}
        <NavLink to="/conta" className={nl}><Icone n="config" /> Configurações</NavLink>
      </Lado>
      <div className="corpo">
        <Topo onMenu={menu} ciclo />
        <AvisoEncerrado />
        <main className="main" id="conteudo"><Pagina key={loc.pathname}><Outlet /></Pagina></main>
      </div>
    </div>
  )
}

export function PortalLayout() {
  const loc = useLocation()
  const [aberto, setAberto] = useState(false)
  const [escondido, setEscondido] = useState(false)
  useEffect(() => { setAberto(false) }, [loc.pathname])
  const menu = () => (matchMedia('(max-width: 900px)').matches ? setAberto(true) : setEscondido((v) => !v))
  const nl = ({ isActive }: { isActive: boolean }) => `nl ${isActive ? 'active' : ''}`
  const items: [string, string, string][] = [
    ['/portal', 'Resumo', 'home'], ['/portal/cobrancas', 'Cobranças e pagamento', 'financeiro'],
    ['/portal/pagamentos', 'Pagamentos e recibos', 'financeiro'], ['/portal/pedidos', 'Pedidos à escola', 'docente'],
    ['/portal/mensagens', 'Mensagens', 'comunicacao'], ['/portal/preferencias', 'Preferências', 'config'],
  ]
  return (
    <div className={`app ${escondido ? 'side-off' : ''}`}>
      <AnimatePresence>
        {aberto && <m.div className="scrim" key="scrim" onClick={() => setAberto(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={T_RAPIDO} />}
      </AnimatePresence>
      <Lado open={aberto}>
        <div className="side-titulo">Portal do encarregado</div>
        {items.map(([to, l, ic]) => <NavLink key={to} to={to} end={to === '/portal'} className={nl}><Icone n={ic} /> {l}</NavLink>)}
        <NavLink to="/conta" className={nl}><Icone n="config" /> Configurações</NavLink>
      </Lado>
      <div className="corpo">
        <Topo onMenu={menu} />
        <main className="main" id="conteudo"><Pagina key={loc.pathname}><Outlet /></Pagina></main>
      </div>
    </div>
  )
}
