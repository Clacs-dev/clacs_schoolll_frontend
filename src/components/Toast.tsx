import { AnimatePresence, m } from 'motion/react'
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

type Kind = 'ok' | 'er' | 'n'
type Item = { id: number; text: string; kind: Kind }
type Ctx = { ok: (t: string) => void; error: (t: string) => void; info: (t: string) => void }

const ToastCtx = createContext<Ctx>({ ok() {}, error() {}, info() {} })
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([])
  const seq = useRef(0)

  const push = useCallback((text: string, kind: Kind) => {
    const id = ++seq.current
    setItems((l) => [...l.slice(-3), { id, text, kind }])
    setTimeout(() => setItems((l) => l.filter((x) => x.id !== id)), kind === 'er' ? 6000 : 3200)
  }, [])

  const ctx = useMemo<Ctx>(
    () => ({ ok: (t) => push(t, 'ok'), error: (t) => push(t, 'er'), info: (t) => push(t, 'n') }),
    [push],
  )

  return (
    <ToastCtx.Provider value={ctx}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        <AnimatePresence initial={false}>
          {items.map((i) => (
            <m.div key={i.id} className={`toast-i ${i.kind}`} layout
              initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.14 } }}>
              {i.text}
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}
