import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Menu "⋯" das acções de uma linha (Visualizar, Editar, Apagar e as acções próprias de cada lista).
 * Abre em posição fixa no ecrã (não fica cortado pelas tabelas com scroll) e fecha ao escolher uma opção,
 * ao clicar fora, com Esc ou ao fazer scroll.
 */
export function MenuAccoes({ children, rotulo = 'Acções' }: { children: ReactNode; rotulo?: string }) {
  const [pos, setPos] = useState<{ top: number; right: number; acima: boolean } | null>(null)
  const ref = useRef<HTMLSpanElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!pos) return
    const fechar = () => setPos(null)
    const fora = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) fechar() }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { fechar(); btn.current?.focus() } }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    window.addEventListener('scroll', fechar, true)
    window.addEventListener('resize', fechar)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', esc)
      window.removeEventListener('scroll', fechar, true)
      window.removeEventListener('resize', fechar)
    }
  }, [pos])
  const abrir = () => {
    if (pos) return setPos(null)
    const r = btn.current!.getBoundingClientRect()
    const acima = window.innerHeight - r.bottom < 220   // perto do fundo do ecrã: abre para cima
    setPos({ top: acima ? r.top - 4 : r.bottom + 4, right: window.innerWidth - r.right, acima })
  }
  return (
    <span className="menu-accoes" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button ref={btn} type="button" className="menu-accoes-btn" aria-haspopup="menu" aria-expanded={!!pos} aria-label={rotulo} title={rotulo}
        onClick={abrir}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2" fill="currentColor" /><circle cx="12" cy="12" r="2" fill="currentColor" /><circle cx="19" cy="12" r="2" fill="currentColor" /></svg>
      </button>
      {pos && (
        // qualquer clique numa opção fecha o menu
        <span className="menu-accoes-lista" role="menu" onClick={() => setPos(null)}
          style={{ top: pos.top, right: pos.right, transform: pos.acima ? 'translateY(-100%)' : undefined }}>
          {children}
        </span>
      )}
    </span>
  )
}
