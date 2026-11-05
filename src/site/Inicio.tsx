import { Link, Navigate } from 'react-router'
import { useAuth } from '@/auth/AuthContext'
import { Loading } from '@/components/ui'
import { CITACAO, DIFERENCIAIS, EQUIPA, ESCOLA, FOTOS, GALERIA, PROJECTO, TESTEMUNHOS, VALORES } from './conteudo'
import { Convite, Ic } from './SiteLayout'

const faixa = GALERIA.filter((f) => f.cat !== 'espacos').slice(2, 12) // as duas primeiras já estão no mosaico
const destaques = [GALERIA[9], GALERIA[2], GALERIA[6], GALERIA[3], GALERIA[17]]

export default function Inicio() {
  const { user, loading, isPortal } = useAuth()
  if (loading) return <div className="s-carregar"><Loading /></div>
  // Com sessão aberta, a raiz continua a levar à aplicação; o site fica acessível nas restantes páginas.
  if (user) return <Navigate to={isPortal ? '/portal' : '/inicio'} replace />

  return (
    <>
      <section className="s-hero">
        <div className="s-caixa s-hero-g">
          <div className="s-hero-t">
            <p className="s-etiqueta">Creche · Pré-Escolar · Ensino Primário · I Ciclo</p>
            <h1>Educar é criar laços e dar <span className="s-traco">afectos</span></h1>
            <p className="s-hero-p">No {ESCOLA}, cada criança é única e especial. A nossa missão é nutrir talentos, desenvolver habilidades e criar memórias que duram para toda a vida.</p>
            <div className="s-accoes">
              <Link className="s-bt" to="/candidatura">Inscreva-se já <Ic n="seta" /></Link>
              <Link className="s-bt s-bt-claro" to="/oferta-educativa">Conheça a oferta educativa</Link>
            </div>
          </div>
          <div className="s-mosaico">
            <img className="s-m1" src={FOTOS.criancas.src} alt={FOTOS.criancas.alt} width="800" height="530" fetchPriority="high" />
            <img className="s-m2" src={GALERIA[1].src} alt={GALERIA[1].alt} width="488" height="372" />
            <img className="s-m3" src={GALERIA[0].src} alt={GALERIA[0].alt} width="488" height="372" />
            <span className="s-m-cor s-m-a" aria-hidden="true" />
            <span className="s-m-cor s-m-b" aria-hidden="true" />
          </div>
        </div>
      </section>

      <section className="s-faixa" aria-label="Momentos na escola">
        <div className="s-faixa-pista">
          {[...faixa, ...faixa].map((f, i) => (
            <img key={i} src={f.src} alt={i < faixa.length ? f.alt : ''} aria-hidden={i >= faixa.length} width="488" height="372" loading="lazy" />
          ))}
        </div>
      </section>

      <section className="s-sec">
        <div className="s-caixa s-dois">
          <div className="s-sobe">
            <p className="s-etiqueta s-e-mag">A nossa história e propósito</p>
            <h2>Um lugar onde as crianças podem florescer</h2>
            <p className="s-lead">No {ESCOLA}, acreditamos que cada criança é única e possui um potencial ilimitado. A nossa abordagem educacional assenta em valores humanos, no desenvolvimento integral e na criação de um ambiente estimulante.</p>
          </div>
          <figure className="s-moldura s-sobe">
            <img src={FOTOS.edificio.src} alt={FOTOS.edificio.alt} width="712" height="540" loading="lazy" />
          </figure>
        </div>
      </section>

      <section className="s-sec s-sec-papel">
        <div className="s-caixa s-mv">
          <article className="s-sobe">
            <img src={GALERIA[13].src} alt="" width="488" height="372" loading="lazy" />
            <div>
              <p className="s-etiqueta s-e-mag">Missão</p>
              <h2>Educar com afecto, excelência e propósito</h2>
              <p>Promover o desenvolvimento global e integral das crianças, do Infantário ao Ensino Primário, com uma abordagem moderna, inclusiva e inovadora, que valorize a identidade de cada criança e a prepare para fazer a diferença no mundo, com consciência e responsabilidade.</p>
            </div>
          </article>
          <article className="s-sobe">
            <img src={FOTOS.turma.src} alt="" width="791" height="530" loading="lazy" />
            <div>
              <p className="s-etiqueta s-e-ceu">Visão</p>
              <h2>Uma referência em Educação Infantil e Ensino Primário</h2>
              <p>Ser reconhecida, a nível nacional e internacional, pela inovação pedagógica, pelo compromisso com o desenvolvimento humano e pela capacidade de transformar vidas através do conhecimento, da empatia e da inclusão.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="s-sec">
        <div className="s-caixa">
          <div className="s-cabeca">
            <p className="s-etiqueta s-e-verde">Os nossos valores</p>
            <h2>O que nos guia todos os dias</h2>
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

      <section className="s-sec s-sec-azul">
        <div className="s-caixa">
          <div className="s-cabeca">
            <p className="s-etiqueta">Porquê o {ESCOLA}</p>
            <h2>Uma experiência educativa completa</h2>
            <p>Excelência académica e desenvolvimento socioemocional, num ambiente seguro e estimulante para cada criança.</p>
          </div>
          <div className="s-dif">
            {DIFERENCIAIS.map((d) => <div key={d.t} className="s-sobe"><h3>{d.t}</h3><p>{d.d}</p></div>)}
          </div>
        </div>
      </section>

      <section className="s-sec">
        <div className="s-caixa s-projecto">
          <div>
            <p className="s-etiqueta s-e-mag">O projecto</p>
            <h2>Pensado ao detalhe, para crescer com cada criança</h2>
            <blockquote>
              <p>“{CITACAO.texto}”</p>
              <cite>{CITACAO.autor}</cite>
            </blockquote>
          </div>
          <div className="s-projecto-l">
            {PROJECTO.map((p) => <article key={p.t} className="s-sobe"><h3>{p.t}</h3><p>{p.d}</p></article>)}
          </div>
        </div>
      </section>

      <section className="s-sec s-sec-papel">
        <div className="s-caixa">
          <div className="s-cabeca s-cabeca-l">
            <div>
              <p className="s-etiqueta s-e-lar">Momentos</p>
              <h2>A alegria de aprender, todos os dias</h2>
            </div>
            <Link className="s-bt s-bt-linha" to="/galeria">Ver toda a galeria <Ic n="seta" /></Link>
          </div>
          <div className="s-bento">
            {destaques.map((f) => (
              <Link key={f.src} to="/galeria" className="s-sobe"><img src={f.src} alt={f.alt} width="488" height="372" loading="lazy" /></Link>
            ))}
          </div>
        </div>
      </section>

      <section className="s-sec">
        <div className="s-caixa">
          <div className="s-cabeca">
            <p className="s-etiqueta s-e-ceu">A equipa</p>
            <h2>As pessoas por trás do nosso sucesso</h2>
          </div>
          <ul className="s-equipa">
            {EQUIPA.map((p) => (
              <li key={p.nome} className="s-sobe">
                <img src={p.foto} alt={`Fotografia de ${p.nome}`} width="216" height="216" loading="lazy" />
                <h3>{p.nome}</h3>
                <p>{p.cargo}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="s-sec s-sec-papel">
        <div className="s-caixa">
          <div className="s-cabeca">
            <p className="s-etiqueta s-e-verde">Testemunhos</p>
            <h2>O que as famílias dizem sobre nós</h2>
          </div>
          <div className="s-test">
            {TESTEMUNHOS.map((t) => (
              <figure key={t.quem} className="s-sobe">
                <blockquote>“{t.texto}”</blockquote>
                <figcaption><b>{t.quem}</b><span>{t.onde}</span></figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <Convite />
    </>
  )
}
