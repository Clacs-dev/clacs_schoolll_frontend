import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import { AnimatePresence, m } from 'motion/react'
import { Icone } from './Icone'
import { T_RAPIDO } from './Motion'

/** Uma entrada da paleta: um ecrã do menu ou uma acção rápida (criar, registar, enviar…). */
export type Entrada = { to: string; label: string; grupo: string; icon: string; accao?: boolean }

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Paleta de comandos (como o Spotlight do macOS ou a pesquisa do Google Workspace):
 * Ctrl/⌘ + K abre, escreve-se parte do nome, setas escolhem, Enter abre.
 */
export function Comandos({ entradas, aberto, onFechar }: { entradas: Entrada[]; aberto: boolean; onFechar: () => void }) {
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const nav = useNavigate()
  const lista = useRef<HTMLUListElement>(null)

  const res = useMemo(() => {
    const t = norm(q.trim())
    const vistos = new Set<string>()
    return entradas.filter((e) => {
      const k = `${e.to}|${e.label}`
      if (vistos.has(k)) return false
      vistos.add(k)
      return !t || norm(`${e.label} ${e.grupo}`).includes(t)
    })
  }, [q, entradas])

  useEffect(() => { if (aberto) { setQ(''); setI(0) } }, [aberto])
  useEffect(() => { setI(0) }, [q])
  useEffect(() => {
    lista.current?.querySelector<HTMLElement>(`[data-i="${i}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [i])

  const abrir = (e?: Entrada) => { if (!e) return; onFechar(); nav(e.to) }
  const onKey = (ev: React.KeyboardEvent) => {
    if (ev.key === 'ArrowDown') { ev.preventDefault(); setI((v) => Math.min(res.length - 1, v + 1)) }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); setI((v) => Math.max(0, v - 1)) }
    else if (ev.key === 'Enter') { ev.preventDefault(); abrir(res[i]) }
    else if (ev.key === 'Escape') onFechar()
  }

  // agrupa mantendo a ordem: acções primeiro, depois os serviços pela ordem do menu
  const grupos: [string, { e: Entrada; n: number }[]][] = []
  res.forEach((e, n) => {
    const g = e.accao ? 'Acções rápidas' : e.grupo
    const alvo = grupos.find(([k]) => k === g)
    if (alvo) alvo[1].push({ e, n }); else grupos.push([g, [{ e, n }]])
  })

  return createPortal(
    <AnimatePresence>
      {aberto && (
        <m.div key="cmd" className="cmd-overlay" onMouseDown={(ev) => ev.target === ev.currentTarget && onFechar()}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={T_RAPIDO}>
          <m.div className="cmd" role="dialog" aria-modal="true" aria-label="Procurar ou ir para"
            initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={T_RAPIDO}>
            <div className="cmd-in">
              <Icone n="procurar" size={20} />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
                placeholder="Procurar um ecrã ou uma acção…" aria-label="Procurar um ecrã ou uma acção"
                role="combobox" aria-expanded="true" aria-controls="cmd-lista" aria-activedescendant={res[i] ? `cmd-${i}` : undefined} />
              <kbd>Esc</kbd>
            </div>
            <ul className="cmd-lista" id="cmd-lista" role="listbox" ref={lista}>
              {!res.length && <li className="cmd-vazio">Nada encontrado para “{q}”.</li>}
              {grupos.map(([g, itens]) => (
                <li key={g} role="presentation">
                  <div className="cmd-g">{g}</div>
                  <ul role="group" aria-label={g}>
                    {itens.map(({ e, n }) => (
                      <li key={`${e.to}${e.label}`} id={`cmd-${n}`} data-i={n} role="option" aria-selected={n === i}
                        className={`cmd-i ${n === i ? 'on' : ''}`} onMouseMove={() => setI(n)} onClick={() => abrir(e)}>
                        <span className={`cmd-ic ${e.accao ? 'accao' : ''}`}><Icone n={e.icon} size={16} /></span>
                        <span className="cmd-l">{e.label}</span>
                        {!e.accao && <span className="cmd-sub">{e.grupo}</span>}
                        <span className="cmd-enter" aria-hidden="true">↵</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <div className="cmd-pe"><span><kbd>↑</kbd><kbd>↓</kbd> escolher</span><span><kbd>↵</kbd> abrir</span><span><kbd>Ctrl</kbd><kbd>K</kbd> abrir em qualquer ecrã</span></div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/** Atalho global Ctrl/⌘ + K. */
export function useAtalhoComandos(abrir: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); abrir() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [abrir])
}

/** Botão "Nova acção" com menu pendente das acções rápidas. */
export function MenuNovo({ accoes }: { accoes: Entrada[] }) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const nav = useNavigate()
  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAberto(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc) }
  }, [aberto])
  if (!accoes.length) return null
  return (
    <div className="novo" ref={ref}>
      <button type="button" className="btn novo-btn" aria-haspopup="menu" aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
        <Icone n="mais" size={18} /> <span>Nova acção</span>
      </button>
      <AnimatePresence>
        {aberto && (
          <m.div className="novo-menu" role="menu" key="menu"
            initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }} transition={T_RAPIDO}>
            {accoes.map((a) => (
              <button key={a.to + a.label} type="button" role="menuitem" className="novo-i" onClick={() => { setAberto(false); nav(a.to) }}>
                <span className="cmd-ic accao"><Icone n={a.icon} size={16} /></span>
                <span><b>{a.label}</b><small>{a.grupo}</small></span>
              </button>
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
