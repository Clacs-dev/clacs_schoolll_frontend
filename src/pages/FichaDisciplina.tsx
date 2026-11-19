import { useState } from 'react'
import { FormDialog, type FieldDef } from '@/components/FormDialog'
import { Btn, Card, Loading } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { api, errMsg } from '@/lib/api'
import { type Row } from '@/lib/data'
import { useAct, useGet } from '@/lib/hooks'

export const fichaFields: FieldDef[] = [
  { name: 'regime', label: 'Regime', required: true, default: 'Anual', placeholder: 'Ex.: Anual' },
  { name: 'tempos_teoricos', label: 'Tempos teóricos por semana', type: 'number', min: 0, max: 40 },
  { name: 'tempos_praticos', label: 'Tempos práticos por semana', type: 'number', min: 0, max: 40 },
  { name: 'precedencia', label: 'Precedência obrigatória', placeholder: 'Em branco: Não tem', wide: true },
  { name: 'objectivos', label: 'Objectivos', type: 'textarea', wide: true, hint: 'Um objectivo por linha' },
  { name: 'bibliografia', label: 'Bibliografia', type: 'textarea', wide: true, hint: 'Uma obra por linha' },
]

/** Subunidades numeradas como no programa oficial: cada linha 1.1, 1.2…; linha começada por «-» é 1.1.1, 1.1.2… */
export function numerarConteudos(conteudos: unknown, unidade: number) {
  const linhas: { nivel: 2 | 3; numero: string; texto: string }[] = []
  let sub = 0, subsub = 0
  for (const bruta of String(conteudos ?? '').split('\n')) {
    const texto = bruta.trim()
    if (!texto) continue
    if (texto.startsWith('-') && sub) {
      subsub += 1
      linhas.push({ nivel: 3, numero: `${unidade}.${sub}.${subsub}`, texto: texto.replace(/^[-\s]+/, '') })
    } else {
      sub += 1; subsub = 0
      linhas.push({ nivel: 2, numero: `${unidade}.${sub}.`, texto: texto.replace(/^[-\s]+/, '') })
    }
  }
  return linhas
}

const lista = (v: unknown) => String(v ?? '').split('\n').map((x) => x.trim().replace(/^[•-]\s*/, '')).filter(Boolean)
const tempos = (t: unknown, p: unknown) => {
  const partes = [t ? `${t} teórico${Number(t) !== 1 ? 's' : ''}` : '', p ? `${p} prático${Number(p) !== 1 ? 's' : ''}` : ''].filter(Boolean)
  return partes.join(' e ') || '—'
}

/** Ficha da disciplina na classe, como o programa oficial: identificação, objectivos e bibliografia. */
export function FichaDisciplina({ classe, disciplina, nomeClasse, nomeDisciplina }: {
  classe: string; disciplina: string; nomeClasse: string; nomeDisciplina: string
}) {
  const toast = useToast()
  const [editar, setEditar] = useState(false)
  const params = { classe_id: classe, disciplina_id: disciplina }
  const q = useGet<Row | null>('/fichas-disciplina', params)
  const f = q.data ?? null
  const gravar = useAct((p: Row) => api.put('/fichas-disciplina', { ...p, classe_id: Number(classe), disciplina_id: Number(disciplina) }),
    { invalidate: ['/fichas-disciplina'], ok: 'Ficha da disciplina guardada.', onDone: () => setEditar(false) })

  if (q.isLoading) return <Loading />
  const objectivos = lista(f?.objectivos), obras = lista(f?.bibliografia)
  return (
    <Card title="Ficha da disciplina" actions={<div className="row-a">
      <Btn variant="ghost" size="sm" onClick={() => api.download('/fichas-disciplina/programa.pdf', params)
        .catch((e) => toast.error(errMsg(e)))}>Baixar programa (PDF)</Btn>
      <Btn size="sm" onClick={() => setEditar(true)}>{f ? 'Editar ficha' : 'Preencher ficha'}</Btn>
    </div>}>
      <table className="ficha-ident">
        <tbody>
          <tr><th>Designação da disciplina:</th><td><b>{nomeDisciplina.toUpperCase()}</b></td></tr>
          <tr><th>Regime:</th><td>{String(f?.regime ?? 'Anual')}</td></tr>
          <tr><th>Classe:</th><td>{nomeClasse}</td></tr>
          <tr><th>Tempos lectivos semanais:</th><td>{tempos(f?.tempos_teoricos, f?.tempos_praticos)}</td></tr>
          <tr><th>Precedência obrigatória:</th><td>{String(f?.precedencia || 'Não tem')}</td></tr>
        </tbody>
      </table>
      <h4 className="ficha-tit">OBJECTIVOS</h4>
      {objectivos.length ? <ul className="ficha-lista">{objectivos.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p className="mu">—</p>}
      <h4 className="ficha-tit">BIBLIOGRAFIA</h4>
      {obras.length ? <ul className="ficha-lista">{obras.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p className="mu">—</p>}
      {editar && <FormDialog title={`Ficha de ${nomeDisciplina} — ${nomeClasse}`} fields={fichaFields} size="lg"
        initial={f ?? { regime: 'Anual' }} onSubmit={(p) => gravar.mutateAsync(p)} onClose={() => setEditar(false)} />}
    </Card>
  )
}
