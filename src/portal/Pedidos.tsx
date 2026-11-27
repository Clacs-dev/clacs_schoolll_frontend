import { useState, type FormEvent } from 'react'
import { FormFields, toPayload, type FieldDef } from '@/components/FormDialog'
import { Modal, useConfirm } from '@/components/Modal'
import { Table } from '@/components/Table'
import { useToast } from '@/components/Toast'
import { Btn, Estado, PageHead, Select, Toolbar } from '@/components/ui'
import { api, errMsg } from '@/lib/api'
import { PARENTESCOS } from '@/lib/academic'
import { asList, type Row } from '@/lib/data'
import { dataPT, hojeISO } from '@/lib/format'
import { useAct, useGet, useList } from '@/lib/hooks'
import { TIPOS_PEDIDO, nomePedido, resumoPedido } from '@/pages/Pedidos'

const ESTADO_TOM: Record<string, string> = { pendente: 'pendente', em_analise: 'pendente', aguarda_informacao: 'atrasada', aprovado: 'pago', concluido: 'pago', rejeitado: 'divida', cancelado: 'anulada' }
const NOME_ESTADO: Record<string, string> = { pendente: 'Aguarda a escola', em_analise: 'Em análise', aguarda_informacao: 'A escola pede informação',
  aprovado: 'Aprovado', concluido: 'Concluído', rejeitado: 'Recusado', cancelado: 'Cancelado' }

/** Campos do pedido, conforme o tipo (o backend valida os mesmos obrigatórios). */
function camposDoTipo(tipo: string, educandos: { value: number; label: string }[], classes: { value: number; label: string }[]): FieldDef[] {
  const educando: FieldDef = { name: 'aluno_id', label: 'Educando', type: 'select', options: educandos, required: true, wide: true }
  const classe: FieldDef = { name: 'classe_id', label: 'Classe pretendida', type: 'select', options: classes, required: true }
  const obs: FieldDef = { name: 'observacoes', label: 'Observações', type: 'textarea' }
  switch (tipo) {
    case 'vaga': return [
      { name: 'nome_aluno', label: 'Nome completo da criança', required: true, wide: true },
      { name: 'data_nascimento', label: 'Data de nascimento', type: 'date' },
      { name: 'sexo', label: 'Sexo', type: 'select', options: [{ value: 'F', label: 'Feminino' }, { value: 'M', label: 'Masculino' }] },
      { name: 'parentesco', label: 'Sou o/a', type: 'select', options: PARENTESCOS, default: 'mae' },
      classe, obs,
    ]
    case 'matricula': return [educando, classe, obs]
    case 'transferencia': return [educando, { name: 'escola_destino', label: 'Escola de destino', required: true, wide: true }, { name: 'motivo', label: 'Motivo', type: 'textarea' }]
    case 'declaracao': return [educando, { name: 'finalidade', label: 'Para que é a declaração', required: true, wide: true, placeholder: 'Ex.: abono de família' }]
    case 'justificacao_falta': return [educando, { name: 'data', label: 'Dia da falta', type: 'date', required: true, default: hojeISO() }, { name: 'motivo', label: 'Motivo', type: 'textarea', required: true }]
    default: return []
  }
}

function NovoPedido({ onClose }: { onClose: () => void }) {
  const eu = useGet<Row>('/portal/eu')
  const classes = useList('/portal/classes')
  const [tipo, setTipo] = useState('')
  const [v, setV] = useState<Row>({})
  const [busy, setBusy] = useState(false)
  const educandos = asList(eu.data?.educandos).map((e: Row) => ({ value: e.id, label: e.nome }))
  const fields = tipo ? camposDoTipo(tipo, educandos, classes.rows.map((c) => ({ value: c.id, label: String(c.designacao) }))) : []
  // Valores por omissão (data de hoje, parentesco…) por baixo do que o encarregado escreveu.
  const valores: Row = { ...Object.fromEntries(fields.map((f) => [f.name, f.default ?? ''])), ...v }
  const criar = useAct((p: Row) => api.post('/portal/pedidos', p), { invalidate: ['/portal/pedidos'], ok: 'Pedido enviado. A escola vai responder.' })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try { await criar.mutateAsync({ tipo, ...toPayload(fields, valores) }); onClose() } catch { /* erro já mostrado */ } finally { setBusy(false) }
  }
  return (
    <Modal title="Novo pedido à escola" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="fgrid">
          <label className="fld wide">
            <span>O que pretende pedir?</span>
            <select required value={tipo} onChange={(e) => { setTipo(e.target.value); setV({}) }}>
              <option value="">Seleccione…</option>
              {TIPOS_PEDIDO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
        </div>
        {tipo && <div style={{ marginTop: 12 }}><FormFields fields={fields} values={valores} set={(n, x) => setV((s) => ({ ...s, [n]: x }))} /></div>}
        <div className="form-f">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" busy={busy} disabled={!tipo}>Enviar pedido</Btn>
        </div>
      </form>
    </Modal>
  )
}

const ABERTOS = ['pendente', 'em_analise', 'aguarda_informacao']

/** A escola pediu mais informação: o encarregado responde e o pedido volta à análise. */
function ResponderPedido({ p, onClose }: { p: Row; onClose: () => void }) {
  const [msg, setMsg] = useState('')
  const enviar = useAct(() => api.post(`/portal/pedidos/${p.id}/responder`, { mensagem: msg.trim() }),
    { invalidate: ['/portal/pedidos'], ok: 'Resposta enviada. O pedido voltou à análise.', onDone: onClose })
  return (
    <Modal title="Responder à escola" onClose={onClose} footer={<>
      <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      <Btn disabled={msg.trim().length < 2} busy={enviar.isPending} onClick={() => enviar.mutate()}>Enviar resposta</Btn>
    </>}>
      {p.resposta ? <p style={{ marginTop: 0 }}><b>A escola pediu:</b> {String(p.resposta)}</p> : null}
      <textarea rows={4} style={{ width: '100%' }} aria-label="Resposta" value={msg} onChange={(e) => setMsg(e.target.value)} />
    </Modal>
  )
}

/** Junta um documento ao pedido (ex.: atestado médico na justificação de falta). */
function AnexarPedido({ p, onClose }: { p: Row; onClose: () => void }) {
  const [f, setF] = useState<File | null>(null)
  const enviar = useAct(() => { const d = new FormData(); d.append('ficheiro', f as File); return api.form(`/portal/pedidos/${p.id}/anexos`, d) },
    { invalidate: ['/portal/pedidos'], ok: 'Documento anexado ao pedido.', onDone: onClose })
  return (
    <Modal title="Anexar documento ao pedido" size="sm" onClose={onClose} footer={<>
      <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      <Btn disabled={!f} busy={enviar.isPending} onClick={() => enviar.mutate()}>Anexar</Btn>
    </>}>
      <input type="file" aria-label="Ficheiro" accept="application/pdf,image/*" onChange={(e) => setF(e.target.files?.[0] ?? null)} />
      <p className="note">PDF ou imagem, até 10 MB. Máximo de 5 anexos por pedido.</p>
    </Modal>
  )
}

export default function PortalPedidos() {
  const toast = useToast()
  const confirm = useConfirm()
  const [tipo, setTipo] = useState('')
  const [novo, setNovo] = useState(false)
  const [responder, setResponder] = useState<Row | null>(null)
  const [anexar, setAnexar] = useState<Row | null>(null)
  const q = useList('/portal/pedidos', { tipo })
  const cancelar = useAct((id: number) => api.post(`/portal/pedidos/${id}/cancelar`), { invalidate: ['/portal/pedidos'], ok: 'Pedido cancelado.' })
  const declaracao = (id: number) => api.download(`/portal/pedidos/${id}/declaracao.pdf`, undefined, undefined, true).catch((e) => toast.error(errMsg(e)))

  return (
    <>
      <PageHead title="Pedidos à escola" sub="Peça uma vaga, matrícula, transferência ou declaração, ou justifique uma falta. Acompanhe aqui a resposta da escola."
        actions={<Btn icon="mais" onClick={() => setNovo(true)}>Novo pedido</Btn>} />
      <Toolbar>
        <Select label="Tipo" value={tipo} onChange={setTipo} placeholder="Todos os pedidos" options={TIPOS_PEDIDO} />
      </Toolbar>
      <Table
        rows={q.rows} loading={q.isLoading} error={q.error} onRetry={() => q.refetch()}
        empty={tipo === 'justificacao_falta' ? 'Ainda não justificou nenhuma falta.' : 'Ainda não fez nenhum pedido.'}
        cols={[
          { h: 'Data', render: (p) => dataPT(p.criado_em) },
          { h: 'Pedido', render: (p) => nomePedido(p.tipo) },
          { h: 'Educando', k: 'aluno' },
          { h: 'Detalhe', render: (p) => resumoPedido(p), nowrap: false },
          { h: 'Estado', render: (p) => <Estado v={ESTADO_TOM[p.estado] ?? p.estado} text={NOME_ESTADO[p.estado] ?? p.estado} /> },
          { h: 'Resposta da escola', render: (p) => p.resposta || (p.resultado?.turma ? `Turma ${p.resultado.turma}` : '—'), nowrap: false },
          { h: 'Anexos', render: (p) => {
            const anexos = Array.isArray(p.dados?.anexos) ? p.dados.anexos : []
            return anexos.length ? anexos.map((a: Row, i: number) => <div key={i}><a href={String(a.url)} target="_blank" rel="noreferrer">{String(a.nome)}</a></div>) : '—'
          } },
          {
            h: '', render: (p) => (
              <span className="row-a">
                {p.tipo === 'declaracao' && p.estado === 'aprovado' && <Btn size="sm" onClick={() => declaracao(p.id)}>Declaração (PDF)</Btn>}
                {p.estado === 'aguarda_informacao' && <Btn size="sm" onClick={() => setResponder(p)}>Responder</Btn>}
                {ABERTOS.includes(String(p.estado)) && <Btn size="sm" variant="ghost" onClick={() => setAnexar(p)}>Anexar</Btn>}
                {p.estado === 'pendente' && <Btn variant="link" onClick={async () => { if (await confirm({ title: 'Cancelar pedido', text: 'Cancelar este pedido?', yes: 'Cancelar pedido' })) cancelar.mutate(p.id) }}>Cancelar</Btn>}
              </span>
            ),
          },
        ]}
      />
      {novo && <NovoPedido onClose={() => setNovo(false)} />}
      {responder && <ResponderPedido p={responder} onClose={() => setResponder(null)} />}
      {anexar && <AnexarPedido p={anexar} onClose={() => setAnexar(null)} />}
    </>
  )
}
