import { AnimatePresence, m } from 'motion/react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

type Kind = 'ok' | 'er' | 'n'
type Item = { id: number; titulo: string; texto: string; kind: Kind; duracao: number }
type Ctx = { ok: (t: string) => void; error: (t: string) => void; info: (t: string) => void }

const ToastCtx = createContext<Ctx>({ ok() {}, error() {}, info() {} })
export const useToast = () => useContext(ToastCtx)

/**
 * Título do aviso conforme a mensagem do sistema (ex.: «Conflito: o professor … já dá …» → «Conflito de horário»),
 * para se perceber de relance o que aconteceu; o texto completo fica por baixo.
 */
const REGRAS: [RegExp, string][] = [
  [/conflito:/i, 'Conflito de horário'],
  [/está encerrado|só consulta/i, 'Ciclo encerrado'],
  [/plano curricular/i, 'Fora do plano curricular'],
  [/já está ocupada/i, 'Sala ocupada'],
  [/já existe|repetid|duplicad/i, 'Já existe'],
  [/feche primeiro/i, 'Ciclo por fechar'],
  [/sem permissão|não tem permissão|sem acesso/i, 'Sem permissão'],
  [/sem ligação|failed to fetch|network/i, 'Sem ligação'],
  [/sessão expirada|credenciais/i, 'Sessão'],
  [/erro no servidor|erro interno/i, 'Erro no servidor'],
]

function separar(texto: string, kind: Kind): { titulo: string; texto: string } {
  if (kind === 'ok') return { titulo: 'Feito', texto }
  if (kind === 'n') return { titulo: 'Informação', texto }
  for (const [re, titulo] of REGRAS) {
    // «Segunda: Conflito: o professor…» → título «Conflito de horário», texto «Segunda: o professor…»
    if (re.test(texto)) return { titulo, texto: texto.replace(/conflito:\s*/i, '').replace(/^./, (c) => c.toUpperCase()) }
  }
  return { titulo: 'Não foi possível concluir', texto }
}

const ICONES: Record<Kind, string> = {
  ok: 'M20 6 9 17l-5-5',
  er: 'M12 8v5M12 16.5v.5M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  n: 'M12 16v-5M12 8v.5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
}

function Aviso({ i, fechar }: { i: Item; fechar: (id: number) => void }) {
  const [pausa, setPausa] = useState(false)
  const resto = useRef(i.duracao)
  const inicio = useRef(Date.now())
  // Fecha sozinho ao fim do tempo; o tempo pára enquanto o rato (ou o foco) está no aviso.
  useEffect(() => {
    if (pausa) return
    inicio.current = Date.now()
    const t = setTimeout(() => fechar(i.id), resto.current)
    return () => { clearTimeout(t); resto.current -= Date.now() - inicio.current }
  }, [pausa, fechar, i.id])
  return (
    <m.div className={`toast-i ${i.kind}`} layout role={i.kind === 'er' ? 'alert' : 'status'}
      onMouseEnter={() => setPausa(true)} onMouseLeave={() => setPausa(false)}
      onFocus={() => setPausa(true)} onBlur={() => setPausa(false)}
      initial={{ opacity: 0, x: 40, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.16 } }}>
      <span className="toast-ic" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d={ICONES[i.kind]} /></svg>
      </span>
      <div className="toast-corpo">
        <b>{i.titulo}</b>
        <span>{i.texto}</span>
      </div>
      <button type="button" className="toast-x" aria-label="Fechar aviso" onClick={() => fechar(i.id)}>×</button>
      <span className={`toast-tempo ${pausa ? 'pausa' : ''}`} style={{ animationDuration: `${i.duracao}ms` }} aria-hidden="true" />
    </m.div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([])
  const seq = useRef(0)

  const fechar = useCallback((id: number) => setItems((l) => l.filter((x) => x.id !== id)), [])
  const push = useCallback((text: string, kind: Kind) => {
    const id = ++seq.current
    const { titulo, texto } = separar(text, kind)
    const duracao = kind === 'er' ? 9000 : kind === 'n' ? 5000 : 3500
    setItems((l) => [...l.filter((x) => !(x.texto === texto && x.kind === kind)).slice(-3), { id, titulo, texto, kind, duracao }])
  }, [])

  const ctx = useMemo<Ctx>(
    () => ({ ok: (t) => push(t, 'ok'), error: (t) => push(t, 'er'), info: (t) => push(t, 'n') }),
    [push],
  )

  return (
    <ToastCtx.Provider value={ctx}>
      {children}
      <div className="toasts" aria-live="polite">
        <AnimatePresence initial={false}>
          {items.map((i) => <Aviso key={i.id} i={i} fechar={fechar} />)}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}
