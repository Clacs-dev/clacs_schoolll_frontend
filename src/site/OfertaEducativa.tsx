import { COMPLEMENTARES, FOTOS, NIVEIS, VALORES } from './conteudo'
import { Convite, TopoPagina, useTitulo } from './SiteLayout'

export default function OfertaEducativa() {
  useTitulo('Oferta educativa')
  return (
    <>
      <TopoPagina
        etiqueta="Oferta educativa"
        titulo="Do primeiro dia aos desafios seguintes"
        texto="Um percurso contínuo, com um projecto pedagógico que acompanha cada etapa do desenvolvimento da criança."
        foto={FOTOS.turma.src}
        alt={FOTOS.turma.alt}
      />

      <section className="s-sec">
        <div className="s-caixa">
          <div className="s-cabeca">
            <p className="s-etiqueta s-e-mag">Níveis de ensino</p>
            <h2>Uma escola para cada idade</h2>
          </div>
          <div className="s-niveis">
            {NIVEIS.map((n) => (
              <article key={n.t} className={`s-sobe c-${n.cor}`}>
                <img src={n.foto} alt={n.alt} width="488" height="372" loading="lazy" />
                <div><h3>{n.t}</h3><p>{n.d}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="s-sec s-sec-azul">
        <div className="s-caixa s-dois">
          <div>
            <p className="s-etiqueta">Áreas complementares</p>
            <h2>Muito além da sala de aula</h2>
            <p className="s-lead">O ensino de línguas assenta na imersão prática, com situações do quotidiano que facilitam a aprendizagem desde cedo. As turmas têm um número reduzido de alunos por sala e suporte psicopedagógico contínuo.</p>
          </div>
          <ul className="s-etiquetas">
            {COMPLEMENTARES.map((c) => <li key={c}>{c}</li>)}
          </ul>
        </div>
      </section>

      <section className="s-sec">
        <div className="s-caixa">
          <div className="s-cabeca">
            <p className="s-etiqueta s-e-verde">A nossa forma de educar</p>
            <h2>Os princípios por trás de cada aula</h2>
          </div>
          <ol className="s-valores">
            {VALORES.map((v, i) => (
              <li key={v.t} className={`s-sobe c-${v.cor}`}>
                <span className="s-num">{String(i + 1).padStart(2, '0')}</span>
                <h3>{v.t}</h3>
                <p>{v.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Convite />
    </>
  )
}
