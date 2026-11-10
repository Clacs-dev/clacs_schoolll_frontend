import type { ReactNode } from 'react'
import { LazyMotion, MotionConfig, domAnimation, m, type Transition } from 'motion/react'

/**
 * Movimento da aplicação (biblioteca Motion).
 * Regra da casa: animar só o que responde a uma acção da pessoa (abrir, fechar, confirmar, mudar de página),
 * com durações curtas e sem efeitos decorativos. Quem pediu ao sistema "menos movimento" não vê transformações.
 */
export const EASE = [0.2, 0.8, 0.2, 1] as const
export const T_RAPIDO: Transition = { duration: 0.16, ease: EASE }
export const T_NORMAL: Transition = { duration: 0.22, ease: EASE }

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    // "strict": só os componentes "m" (leves), para o pacote ficar pequeno
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user" transition={T_NORMAL}>
        {children}
      </MotionConfig>
    </LazyMotion>
  )
}

/** Entrada discreta do conteúdo quando se muda de página (o "key" do pai decide quando repetir). */
export function Pagina({ children }: { children: ReactNode }) {
  return (
    <m.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={T_NORMAL}>
      {children}
    </m.div>
  )
}
