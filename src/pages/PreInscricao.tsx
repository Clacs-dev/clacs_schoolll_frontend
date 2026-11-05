import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { FormFields, initialValues, toPayload, type FieldDef } from '@/components/FormDialog'
import { Btn } from '@/components/ui'
import { api, errMsg } from '@/lib/api'
import { PARENTESCOS } from '@/lib/academic'
import { type Row } from '@/lib/data'
import { CONTACTOS, GALERIA } from '@/site/conteudo'
import { Ic, TopoPagina, useTitulo } from '@/site/SiteLayout'

const SIM_NAO = [{ value: 'Sim', label: 'Sim' }, { value: 'Não', label: 'Não' }]
const LIMITE_OBS = 1000 // máximo aceite pela API em "observacoes"

const parentescoDe = (v: unknown) => PARENTESCOS.find((p) => p.value === v)?.label ?? ''

/** A API só tem campos para o essencial: o resto segue em "observacoes", para a coordenação o ler. */
function observacoes(v: Row, comSegundo: boolean) {
  const segundo = comSegundo && v.r2_nome
    ? `Segundo responsável: ${[v.r2_nome, parentescoDe(v.r2_parentesco), v.r2_telefone, v.r2_email].filter(Boolean).join(' · ')}`
    : ''
  return [
    v.nee && `Necessidades educativas especiais: ${v.nee}`,
    v.irmaos && `Irmão(s) já na instituição: ${v.irmaos}`,
    v.nacionalidade && `Nacionalidade do responsável: ${v.nacionalidade}`,
    segundo,
    v.observacoes,
  ].filter(Boolean).join('\n')
}

/** Pré-inscrição de um aluno novo, pública (sem conta). Vai para a coordenação do nível, como as do Google Forms. */
export default function PreInscricao() {
  useTitulo('Pré-inscrição')
  const [classes, setClasses] = useState<{ value: number; label: string }[]>([])
  const [feito, setFeito] = useState<Row | null>(null)
  const [erro, setErro] = useState('')
  const [busy, setBusy] = useState(false)
  const [comSegundo, setComSegundo] = useState(false)

  const crianca: FieldDef[] = [
    { name: 'nome_aluno', label: 'Nome completo da criança', required: true, wide: true },
    { name: 'data_nascimento', label: 'Data de nascimento', type: 'date' },
    { name: 'sexo', label: 'Sexo', type: 'select', options: [{ value: 'F', label: 'Feminino' }, { value: 'M', label: 'Masculino' }], empty: 'Seleccione…' },
    { name: 'classe_id', label: 'Classe pretendida', type: 'select', options: classes, required: true },
    { name: 'escola_anterior', label: 'Escola anterior (se houver)' },
    { name: 'nee', label: 'Necessidades educativas especiais', type: 'select', options: SIM_NAO, empty: 'Seleccione…' },
    { name: 'irmaos', label: 'Tem irmão(s) a estudar na escola?', type: 'select', options: SIM_NAO, empty: 'Seleccione…' },
  ]
  const responsavel: FieldDef[] = [
    { name: 'nome_encarregado', label: 'Nome do encarregado de educação', required: true, wide: true },
    { name: 'parentesco', label: 'Parentesco', type: 'select', options: PARENTESCOS, default: 'mae', required: true },
    { name: 'nacionalidade', label: 'Nacionalidade' },
    { name: 'telefone', label: 'Telefone / WhatsApp', type: 'tel', placeholder: '+244 9XX XXX XXX', hint: 'Telefone ou e-mail: pelo menos um' },
    { name: 'email', label: 'E-mail', type: 'email', placeholder: 'exemplo@email.com' },
  ]
  const segundo: FieldDef[] = [
    { name: 'r2_nome', label: 'Nome', required: true, wide: true },
    { name: 'r2_parentesco', label: 'Parentesco', type: 'select', options: PARENTESCOS, empty: 'Seleccione…' },
    { name: 'r2_telefone', label: 'Telefone', type: 'tel' },
    { name: 'r2_email', label: 'E-mail', type: 'email' },
  ]
  const finais: FieldDef[] = [
    { name: 'observacoes', label: 'Informação que queira acrescentar', type: 'textarea' },
    { name: 'aceito', label: 'Dados pessoais', type: 'checkbox', hint: 'Autorizo a escola a tratar estes dados para a candidatura' },
  ]
  // Só estes seguem como campos próprios na API (nee, irmãos, nacionalidade e 2.º responsável vão em "observacoes").
  const paraApi = [...crianca, ...responsavel, ...finais].filter((f) => !['nee', 'irmaos', 'nacionalidade', 'observacoes'].includes(f.name))
  const todos = [...crianca, ...responsavel, ...segundo, ...finais]

  const [valores, setValores] = useState<Row>(() => initialValues(todos))
  const set = (n: string, v: unknown) => setValores((s) => ({ ...s, [n]: v }))

  useEffect(() => {
    api.get<Row[]>('/publico/candidaturas/classes')
      .then((r) => setClasses(r.map((c) => ({ value: c.id, label: `${c.designacao} (${c.nivel})` }))))
      .catch((e) => setErro(errMsg(e)))
  }, [])

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (!valores.telefone && !valores.email) { setErro('Indique o telefone ou o e-mail.'); return }
    if (!valores.aceito) { setErro('É preciso autorizar o tratamento dos dados.'); return }
    const obs = observacoes(valores, comSegundo)
    if (obs.length > LIMITE_OBS) { setErro(`A informação adicional é demasiado longa: encurte-a em ${obs.length - LIMITE_OBS} caracteres.`); return }
    setBusy(true); setErro('')
    try {
      const form = e.currentTarget as HTMLFormElement
      const site = (form.elements.namedItem('site') as HTMLInputElement | null)?.value || undefined
      setFeito(await api.post<Row>('/publico/candidaturas', { ...toPayload(paraApi, valores), observacoes: obs || undefined, site }))
      window.scrollTo({ top: 0 })
    } catch (err) { setErro(errMsg(err)) } finally { setBusy(false) }
  }

  const recomecar = () => { setFeito(null); setComSegundo(false); setValores(initialValues(todos)) }

  return (
    <>
      <TopoPagina
        etiqueta="Pré-inscrição"
        titulo="Faça parte da nossa família"
        texto="Garanta a vaga do seu filho ou da sua filha: preencha o formulário e a nossa equipa entrará em contacto."
        foto={GALERIA[13].src}
        alt={GALERIA[13].alt}
      />
      <section className="s-sec">
        <div className="s-caixa s-form-g">
          <aside className="s-passos">
            <h2>Como funciona</h2>
            <ol>
              <li><b>Preencha</b> os dados da criança e do encarregado.</li>
              <li><b>A coordenação analisa</b> a pré-inscrição do nível pretendido.</li>
              <li><b>Contactamos a família</b> para marcar uma reunião.</li>
            </ol>
            <p>Precisa de ajuda?</p>
            <a href={CONTACTOS.whatsapp} target="_blank" rel="noreferrer"><Ic n="chat" size={18} /> {CONTACTOS.telefone}</a>
            <a href={`mailto:${CONTACTOS.email}`}><Ic n="mail" size={18} /> {CONTACTOS.email}</a>
          </aside>

          <div className="s-cartao-form">
            {feito ? (
              <div className="s-feito">
                <h2>Pré-inscrição recebida</h2>
                <div className="okm" role="status">{String(feito.mensagem)}</div>
                <p>Referência da pré-inscrição: <b>{String(feito.referencia)}</b>. Guarde-a para qualquer contacto com a escola.</p>
                <Btn variant="ghost" onClick={recomecar}>Fazer outra pré-inscrição</Btn>
              </div>
            ) : (
              <form onSubmit={enviar}>
                <h2>Formulário de pré-inscrição</h2>
                {erro && <div className="err" role="alert">{erro}</div>}

                <h3>Dados da criança</h3>
                <FormFields fields={crianca} values={valores} set={set} />

                <h3>Responsável principal</h3>
                <FormFields fields={responsavel} values={valores} set={set} />

                {comSegundo ? (
                  <>
                    <h3>Segundo responsável</h3>
                    <FormFields fields={segundo} values={valores} set={set} />
                    <button type="button" className="s-bt-texto" onClick={() => setComSegundo(false)}>Remover o segundo responsável</button>
                  </>
                ) : (
                  <button type="button" className="s-bt-texto" onClick={() => setComSegundo(true)}>+ Adicionar segundo responsável</button>
                )}

                <h3>Para terminar</h3>
                <FormFields fields={finais} values={valores} set={set} />

                {/* anti-spam: escondido das pessoas, os robôs preenchem-no */}
                <input name="site" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }} />
                <div className="form-f"><Btn type="submit" busy={busy}>Enviar pré-inscrição</Btn></div>
              </form>
            )}
            <p className="s-nota"><Link to="/login">Já é encarregado? Entrar no portal</Link></p>
          </div>
        </div>
      </section>
    </>
  )
}
