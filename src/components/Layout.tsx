import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { AnimatePresence, m } from 'motion/react'
import { useAuth } from '@/auth/AuthContext'
import { nameOf, pick, type Row } from '@/lib/data'
import { estadoCiclo, nomeCiclo, useCicloActual } from '@/lib/ciclos'
import { isActivo } from '@/lib/academic'
import { AuthImage } from './AuthImage'
import { Pagina, T_NORMAL, T_RAPIDO } from './Motion'
import { Icone } from './Icone'
import { Comandos, MenuNovo, useAtalhoComandos, type Entrada } from './Comandos'

export { Icone } from './Icone'

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
  // (se o menu também tiver o caminho sem separador, é essa a entrada activa)
  const todos = NAV.flatMap((g) => g.items)
  if (!actual.size) return !todos.some(([t]) => t === path) && todos.find(([t]) => t.startsWith(`${path}?`))?.[0] === to
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

/** Acções rápidas do pessoal da escola: [destino, nome, serviço, ícone, módulo, visibilidade]. */
type Accao = [string, string, string, string, string?, ('naoProfessor' | 'soProfessor')?]
const ACCOES: Accao[] = [
  ['/matriculas?novo=1', 'Nova matrícula', 'Secretaria', 'matricula', 'cadastro', 'naoProfessor'],
  ['/pagamentos?novo=1', 'Registar pagamento', 'Financeiro', 'financeiro', 'propinas'],
  ['/assiduidade', 'Marcar assiduidade', 'Pedagógico', 'visto', 'pedagogico'],
  ['/avaliacoes', 'Lançar notas', 'Pedagógico', 'notas', 'pedagogico'],
  ['/ocorrencias', 'Registar ocorrência', 'Pedagógico', 'alerta', 'pedagogico'],
  ['/mensagens', 'Enviar comunicado', 'Comunicação', 'comunicacao', 'comunicacao'],
  ['/pedidos?estado=pendente', 'Decidir pedidos', 'Secretaria', 'doc', 'cadastro', 'naoProfessor'],
]
const ACCOES_PORTAL: Entrada[] = [
  { to: '/portal/cobrancas', label: 'Pagar propinas', grupo: 'Financeiro', icon: 'financeiro', accao: true },
  { to: '/portal/pedidos', label: 'Fazer um pedido à escola', grupo: 'Secretaria', icon: 'doc', accao: true },
  { to: '/portal/mensagens', label: 'Ler mensagens', grupo: 'Comunicação', icon: 'comunicacao', accao: true },
]

const PERFIS: Record<string, string> = { admin: 'Administrador', professor: 'Professor', secretaria: 'Secretaria', direccao: 'Direcção', encarregado: 'Encarregado' }
function perfilDe(user: Row | null) {
  const p: string[] = Array.isArray(user?.perfis) ? user!.perfis : []
  if (!p.length) return 'Encarregado de educação'
  return PERFIS[p[0]] ?? (p[0].charAt(0).toUpperCase() + p[0].slice(1).replace(/_/g, ' '))
}

function Topo({ onMenu, ciclo, contexto, entradas, accoes }: {
  onMenu: () => void; ciclo?: boolean; contexto?: [string?, string?]; entradas: Entrada[]; accoes: Entrada[]
}) {
  const { user, logout } = useAuth()
  const toggleTheme = useTheme()
  const [cmd, setCmd] = useState(false)
  const abrirCmd = useCallback(() => setCmd(true), [])
  useAtalhoComandos(abrirCmd)
  const [grupo, pagina] = contexto ?? []
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
  return (
    <header className="topo">
      <button type="button" className="topo-btn" onClick={onMenu} aria-label="Mostrar ou esconder o menu" title="Menu">
        <Icone n="gestao" size={20} />
      </button>
      {pagina && (
        <nav className="topo-migalhas" aria-label="Onde está">
          {grupo && <><span>{grupo}</span><i aria-hidden="true">/</i></>}
          <b>{pagina}</b>
        </nav>
      )}
      <span className="grow" />
      <button type="button" className="topo-procura" onClick={abrirCmd} aria-label="Procurar ou ir para (Ctrl+K)">
        <Icone n="procurar" size={16} />
        <span>Procurar ou ir para…</span>
        <kbd>{mac ? '⌘' : 'Ctrl'} K</kbd>
      </button>
      {ciclo && <SeletorCiclo />}
      <MenuNovo accoes={accoes} />
      <button type="button" className="topo-btn" onClick={toggleTheme} aria-label="Alternar tema claro/escuro" title="Alternar tema">
        <Icone n="tema" />
      </button>
      <NavLink to="/conta" className="topo-user" title="O meu perfil">
        <Avatar user={user} size={32} />
        <span className="topo-user-t"><b>{nameOf(user) || 'Utilizador'}</b><small>{perfilDe(user)}</small></span>
      </NavLink>
      <button type="button" className="topo-btn" onClick={logout} aria-label="Terminar sessão" title="Terminar sessão">
        <Icone n="sair" />
      </button>
      <Comandos entradas={[...accoes, ...entradas]} aberto={cmd} onFechar={() => setCmd(false)} />
    </header>
  )
}

function Lado({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <aside className={`side ${open ? 'open' : ''}`} aria-label="Navegação principal">
      <div className="brand">
        <Logo />
        <small>Sistema de Gestão Escolar</small>
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

  // paleta de comandos: todos os ecrãs que a pessoa pode abrir
  const entradas: Entrada[] = [
    { to: '/inicio', label: 'Home', grupo: 'Início', icon: 'home' },
    ...NAV.flatMap((g) => g.items.filter(visivel).map(([to, l]) => ({ to, label: l, grupo: g.group, icon: g.icon }))),
    { to: '/conta', label: 'O meu perfil e configurações', grupo: 'Conta', icon: 'config' },
  ]
  const accoes: Entrada[] = ACCOES
    .filter(([, , , , mod, v]) => visivel(['', '', mod, v]))
    .map(([to, label, grupo, icon]) => ({ to, label, grupo, icon, accao: true }))
  // migalhas no topo: serviço / ecrã
  let contexto: [string?, string?] = []
  if (loc.pathname === '/inicio') contexto = [undefined, 'Home']
  else if (loc.pathname === '/conta') contexto = ['Conta', 'O meu perfil']
  else if (loc.pathname.startsWith('/alunos/')) contexto = ['Secretaria', 'Processo do aluno']
  else {
    for (const g of NAV) {
      const it = g.items.find((i) => visivel(i) && activo(i[0], loc.pathname, loc.search))
      if (it) { contexto = [g.group, it[1]]; break }
    }
  }

  return (
    <div className={`app ${escondido ? 'side-off' : ''}`}>
      <AnimatePresence>
        {aberto && <m.div className="scrim" key="scrim" onClick={() => setAberto(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={T_RAPIDO} />}
      </AnimatePresence>
      <Lado open={aberto}>
        <NavLink to="/inicio" className={nl}><Icone n="home" /> Home</NavLink>
        <div className="side-titulo">Serviços</div>
        {NAV.map((g) => {
          const itens = g.items.filter(visivel)
          if (!itens.length) return null
          const expandido = grupoAberto === g.group
          const temActivo = itens.some(([to]) => activo(to, loc.pathname, loc.search))
          return (
            <div className="nav-group" key={g.group}>
              <button type="button" className={`nav-g-btn ${expandido ? 'expanded' : ''} ${temActivo ? 'tem-activo' : ''}`} aria-expanded={expandido}
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
        <span className="sp" />
        <NavLink to="/conta" className={nl}><Icone n="config" /> Configurações</NavLink>
      </Lado>
      <div className="corpo">
        <Topo onMenu={menu} ciclo contexto={contexto} entradas={entradas} accoes={accoes} />
        <AvisoEncerrado />
        <main className="main" id="conteudo"><Pagina key={loc.pathname}><Outlet /></Pagina></main>
      </div>
    </div>
  )
}

const ITENS_PORTAL: [string, string, string][] = [
  ['/portal', 'Resumo', 'home'], ['/portal/cobrancas', 'Cobranças e pagamento', 'financeiro'],
  ['/portal/pagamentos', 'Pagamentos e recibos', 'doc'], ['/portal/pedidos', 'Pedidos à escola', 'secretaria'],
  ['/portal/mensagens', 'Mensagens', 'comunicacao'], ['/portal/preferencias', 'Preferências', 'sino'],
]

export function PortalLayout() {
  const loc = useLocation()
  const [aberto, setAberto] = useState(false)
  const [escondido, setEscondido] = useState(false)
  useEffect(() => { setAberto(false) }, [loc.pathname])
  const menu = () => (matchMedia('(max-width: 900px)').matches ? setAberto(true) : setEscondido((v) => !v))
  const nl = ({ isActive }: { isActive: boolean }) => `nl ${isActive ? 'active' : ''}`
  const entradas: Entrada[] = [
    ...ITENS_PORTAL.map(([to, label, icon]) => ({ to, label, grupo: 'Portal do encarregado', icon })),
    { to: '/conta', label: 'O meu perfil e configurações', grupo: 'Conta', icon: 'config' },
  ]
  const actual = ITENS_PORTAL.find(([to]) => (to === '/portal' ? loc.pathname === to : loc.pathname.startsWith(to)))
  const contexto: [string?, string?] = actual ? ['Portal', actual[1]]
    : loc.pathname.startsWith('/portal/educandos') ? ['Portal', 'Educando']
    : loc.pathname === '/conta' ? ['Conta', 'O meu perfil'] : []
  return (
    <div className={`app ${escondido ? 'side-off' : ''}`}>
      <AnimatePresence>
        {aberto && <m.div className="scrim" key="scrim" onClick={() => setAberto(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={T_RAPIDO} />}
      </AnimatePresence>
      <Lado open={aberto}>
        <div className="side-titulo">Portal do encarregado</div>
        {ITENS_PORTAL.map(([to, l, ic]) => <NavLink key={to} to={to} end={to === '/portal'} className={nl}><Icone n={ic} /> {l}</NavLink>)}
        <span className="sp" />
        <NavLink to="/conta" className={nl}><Icone n="config" /> Configurações</NavLink>
      </Lado>
      <div className="corpo">
        <Topo onMenu={menu} contexto={contexto} entradas={entradas} accoes={ACCOES_PORTAL} />
        <main className="main" id="conteudo"><Pagina key={loc.pathname}><Outlet /></Pagina></main>
      </div>
    </div>
  )
}
