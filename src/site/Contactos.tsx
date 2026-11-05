import { useState, type FormEvent } from 'react'
import { CONTACTOS, ESCOLA, FOTOS } from './conteudo'
import { Ic, TopoPagina, useTitulo } from './SiteLayout'

export default function Contactos() {
  useTitulo('Contactos')
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [mensagem, setMensagem] = useState('')

  // Sem serviço de mensagens no servidor: abre o WhatsApp ou o e-mail da família com o texto já escrito.
  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const canal = (e.nativeEvent as SubmitEvent).submitter?.getAttribute('value')
    const texto = `${mensagem.trim()}\n\n${nome.trim()}${telefone.trim() ? ` · ${telefone.trim()}` : ''}`
    if (canal === 'email') {
      location.href = `mailto:${CONTACTOS.email}?subject=${encodeURIComponent(`Contacto pelo site: ${nome.trim()}`)}&body=${encodeURIComponent(texto)}`
    } else {
      window.open(`${CONTACTOS.whatsapp}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener')
    }
  }

  return (
    <>
      <TopoPagina
        etiqueta="Contactos"
        titulo="Vamos conversar"
        texto={`Tem dúvidas ou quer conhecer o ${ESCOLA}? A secretaria tem todo o gosto em ajudar.`}
        foto={FOTOS.edificio.src}
        alt={FOTOS.edificio.alt}
      />
      <section className="s-sec">
        <div className="s-caixa s-contactos">
          <div>
            <h2>Onde nos encontrar</h2>
            <ul className="s-c-lista">
              <li><a href={CONTACTOS.whatsapp} target="_blank" rel="noreferrer"><span><Ic n="chat" /></span><div><b>WhatsApp e telefone</b>{CONTACTOS.telefone}</div></a></li>
              <li><a href={`mailto:${CONTACTOS.email}`}><span><Ic n="mail" /></span><div><b>E-mail</b>{CONTACTOS.email}</div></a></li>
              <li><a href={CONTACTOS.mapa} target="_blank" rel="noreferrer"><span><Ic n="pin" /></span><div><b>Morada</b>{CONTACTOS.morada}</div></a></li>
              <li><a href={CONTACTOS.facebook.url} target="_blank" rel="noreferrer"><span><Ic n="face" /></span><div><b>Facebook</b>{CONTACTOS.facebook.nome}</div></a></li>
              <li><a href={CONTACTOS.instagram.url} target="_blank" rel="noreferrer"><span><Ic n="insta" /></span><div><b>Instagram</b>{CONTACTOS.instagram.nome}</div></a></li>
            </ul>
          </div>
          <form className="s-cartao-form" onSubmit={enviar}>
            <h2>Envie-nos uma mensagem</h2>
            <label className="fld"><span>O seu nome <em aria-hidden>*</em></span>
              <input required autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} />
            </label>
            <label className="fld"><span>Telefone</span>
              <input type="tel" autoComplete="tel" placeholder="+244 9XX XXX XXX" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </label>
            <label className="fld"><span>Mensagem <em aria-hidden>*</em></span>
              <textarea required rows={5} value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
            </label>
            <div className="s-accoes">
              <button className="s-bt" type="submit" value="whatsapp"><Ic n="chat" /> Enviar por WhatsApp</button>
              <button className="s-bt s-bt-linha" type="submit" value="email"><Ic n="mail" /> Enviar por e-mail</button>
            </div>
          </form>
        </div>
      </section>
    </>
  )
}
