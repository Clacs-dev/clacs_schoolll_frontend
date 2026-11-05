import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { CATEGORIAS, GALERIA, type Categoria } from './conteudo'
import { Convite, Ic, TopoPagina, useTitulo } from './SiteLayout'

export default function Galeria() {
  useTitulo('Galeria')
  const [cat, setCat] = useState<Categoria | 'todas'>('todas')
  const [aberta, setAberta] = useState<number | null>(null)
  const dialogo = useRef<HTMLDialogElement>(null)
  const fotos = cat === 'todas' ? GALERIA : GALERIA.filter((f) => f.cat === cat)
  const foto = aberta === null ? null : fotos[aberta]

  useEffect(() => {
    const d = dialogo.current
    if (!d) return
    if (aberta !== null && !d.open) d.showModal()
    if (aberta === null && d.open) d.close()
  }, [aberta])

  const mover = (delta: number) => setAberta((i) => (i === null ? i : (i + delta + fotos.length) % fotos.length))
  const teclas = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') mover(1)
    if (e.key === 'ArrowLeft') mover(-1)
  }

  return (
    <>
      <TopoPagina
        etiqueta="Galeria"
        titulo="Os nossos momentos"
        texto="O dia-a-dia da escola: as brincadeiras, as descobertas e os espaços onde tudo acontece."
        foto={GALERIA[1].src}
        alt={GALERIA[1].alt}
      />

      <section className="s-sec">
        <div className="s-caixa">
          <div className="s-filtros" role="group" aria-label="Filtrar fotografias">
            {CATEGORIAS.map(([id, nome]) => (
              <button key={id} type="button" aria-pressed={cat === id} onClick={() => setCat(id)}>{nome}</button>
            ))}
          </div>
          <ul className="s-grelha">
            {fotos.map((f, i) => (
              <li key={f.src}>
                <button type="button" onClick={() => setAberta(i)} aria-label={`Ampliar: ${f.alt}`}>
                  <img src={f.src} alt="" width="488" height="372" loading="lazy" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <dialog ref={dialogo} className="s-caixa-luz" aria-label="Fotografia ampliada" onKeyDown={teclas}
        onClose={() => setAberta(null)} onClick={(e) => { if (e.target === e.currentTarget) setAberta(null) }}>
        {foto && (
          <div className="s-luz">
            <button type="button" className="s-luz-f" onClick={() => setAberta(null)} aria-label="Fechar"><Ic n="fechar" size={24} /></button>
            <button type="button" className="s-luz-a" onClick={() => mover(-1)} aria-label="Fotografia anterior"><Ic n="anterior" size={26} /></button>
            <figure>
              <img src={foto.src} alt={foto.alt} />
              <figcaption>{foto.alt} <span>{aberta! + 1} / {fotos.length}</span></figcaption>
            </figure>
            <button type="button" className="s-luz-s" onClick={() => mover(1)} aria-label="Fotografia seguinte"><Ic n="seguinte" size={26} /></button>
          </div>
        )}
      </dialog>

      <Convite />
    </>
  )
}
