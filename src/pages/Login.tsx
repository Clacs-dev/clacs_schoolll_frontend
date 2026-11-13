import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router'
import { useAuth } from '@/auth/AuthContext'
import { api, errMsg } from '@/lib/api'
import { Btn } from '@/components/ui'
import { Logo } from '@/components/Layout'
import { m } from 'motion/react'
import { EASE } from '@/components/Motion'

const ESCOLA = (import.meta.env.VITE_ESCOLA_NOME as string | undefined) || 'Talatona Kids'

/**
 * Início de sessão e recuperação de senha: o "hero" da escola, com o texto à esquerda e o formulário à direita.
 * "largo" (página da família): fundo azul-escuro a toda a largura, para formulários compridos.
 */
export function AuthShell({ children, largo }: { children: ReactNode; largo?: boolean }) {
  const rodape = <footer className="entrada-rodape">© Clacstecnologia.com. Todos os direitos reservados.</footer>
  if (largo) {
    return (
      <div className="entrada">
        <header className="entrada-marca"><Link to="/login"><Logo /></Link></header>
        <div className="entrada-largo">{children}</div>
        {rodape}
      </div>
    )
  }
  return (
    <div className="entrada-hero">
      <header className="eh-cab">
        <div className="eh-caixa"><Link to="/login" aria-label={ESCOLA}><Logo /></Link></div>
        <div className="eh-fita" aria-hidden="true"><i /><i /><i /><i /><i /></div>
      </header>
      <main className="eh-caixa eh-grelha">
        <m.div className="eh-texto" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
          <p className="eh-etiqueta">Creche · Pré-Escolar · Ensino Primário · I Ciclo</p>
          <h1>Educar é criar laços e dar <span>afectos</span></h1>
          <p className="eh-p">No {ESCOLA}, cada criança é única e especial. A nossa missão é nutrir talentos, desenvolver habilidades e criar memórias que duram para toda a vida.</p>
        </m.div>
        <m.div className="eh-cartao" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.12, ease: EASE }}>
          <span className="eh-cor eh-cor-a" aria-hidden="true" />
          <span className="eh-cor eh-cor-b" aria-hidden="true" />
          <div className="entrada-caixa">{children}</div>
        </m.div>
      </main>
      {rodape}
    </div>
  )
}

export function Login() {
  const { user, login, isPortal } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [codigo, setCodigo] = useState('')
  const [needCode, setNeedCode] = useState(false)
  const [erro, setErro] = useState(() => {
    try {
      if (sessionStorage.getItem('clacs.expirada')) { sessionStorage.removeItem('clacs.expirada'); return 'A sessão expirou. Inicie sessão novamente.' }
    } catch { /* sem storage */ }
    return ''
  })
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={isPortal ? '/portal' : '/inicio'} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErro('')
    const r = await login(email, senha, needCode ? codigo : undefined)
    setBusy(false)
    if (r.ok) return // com a sessão aberta, o redireccionamento acima trata do resto
    if (r.needCode) setNeedCode(true)
    setErro(r.message)
  }

  return (
    <AuthShell>
      <form className="auth-form" onSubmit={submit}>
        <h2>Iniciar sessão</h2>
        <p className="sub" style={{ margin: 0 }}>Direcção, secretaria, docentes e encarregados de educação.</p>
        {erro && <div className="err" role="alert">{erro}</div>}
        <label className="fld"><span>E-mail</span>
          <input type="email" autoComplete="username" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="fld"><span>Palavra-passe</span>
          <input type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
        </label>
        {needCode && (
          <label className="fld"><span>Código de verificação (dois passos)</span>
            <input inputMode="numeric" autoComplete="one-time-code" required autoFocus maxLength={8} value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            <small>Abra a aplicação autenticadora e introduza o código de 6 dígitos.</small>
          </label>
        )}
        <Btn type="submit" busy={busy}>Entrar</Btn>
        <div className="links"><Link to="/recuperar">Esqueci a minha palavra-passe</Link></div>
      </form>
    </AuthShell>
  )
}

export function Recuperar() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [erro, setErro] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setErro('')
    try { await api.post('/auth/recuperar', { email: email.trim() }); setDone(true) } catch (x) { setErro(errMsg(x)) }
    setBusy(false)
  }
  return (
    <AuthShell>
      <form className="auth-form" onSubmit={submit}>
        <h2>Recuperar palavra-passe</h2>
        {done ? (
          <div className="okm">Se o e-mail existir, enviámos um link para definir uma nova palavra-passe.</div>
        ) : (
          <>
            <p className="sub" style={{ margin: 0 }}>Indique o e-mail da sua conta. Enviamos um link para definir uma nova palavra-passe.</p>
            {erro && <div className="err" role="alert">{erro}</div>}
            <label className="fld"><span>E-mail</span>
              <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <Btn type="submit" busy={busy}>Enviar link</Btn>
          </>
        )}
        <div className="links"><Link to="/login">Voltar ao início de sessão</Link></div>
      </form>
    </AuthShell>
  )
}

export function Redefinir() {
  const [sp] = useSearchParams()
  const [token, setToken] = useState(sp.get('token') || '')
  const [senha, setSenha] = useState('')
  const [conf, setConf] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [erro, setErro] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (senha !== conf) { setErro('As palavras-passe não coincidem.'); return }
    setBusy(true); setErro('')
    try { await api.post('/auth/redefinir', { token: token.trim(), senha_nova: senha }); setDone(true) } catch (x) { setErro(errMsg(x)) }
    setBusy(false)
  }
  return (
    <AuthShell>
      <form className="auth-form" onSubmit={submit}>
        <h2>Nova palavra-passe</h2>
        {done ? (
          <div className="okm">Palavra-passe alterada. Já pode iniciar sessão.</div>
        ) : (
          <>
            {erro && <div className="err" role="alert">{erro}</div>}
            {!sp.get('token') && (
              <label className="fld"><span>Código recebido por e-mail</span>
                <input required value={token} onChange={(e) => setToken(e.target.value)} />
              </label>
            )}
            <label className="fld"><span>Nova palavra-passe</span>
              <input type="password" autoComplete="new-password" minLength={8} required value={senha} onChange={(e) => setSenha(e.target.value)} />
            </label>
            <label className="fld"><span>Repetir palavra-passe</span>
              <input type="password" autoComplete="new-password" minLength={8} required value={conf} onChange={(e) => setConf(e.target.value)} />
            </label>
            <Btn type="submit" busy={busy}>Guardar</Btn>
          </>
        )}
        <div className="links"><Link to="/login">Ir para o início de sessão</Link></div>
      </form>
    </AuthShell>
  )
}
