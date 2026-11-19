import { useState } from 'react'
import { FormDialog, type FieldDef } from '@/components/FormDialog'
import { Modal } from '@/components/Modal'
import { Table } from '@/components/Table'
import { Btn, Card, Kpi, Loading, PageHead, Select, Tabs, Tag, Toolbar } from '@/components/ui'
import { alunoOptions } from '@/lib/academic'
import { api } from '@/lib/api'
import { asList, type Row } from '@/lib/data'
import { dataPT, type Tone } from '@/lib/format'
import { useAct, useGet, useList } from '@/lib/hooks'

const INV = ['/saude', '/alertas']
const DESFECHOS = [{ value: 'ficou_na_escola', label: 'Ficou na escola' }, { value: 'recolhido', label: 'Recolhido pela família' },
  { value: 'encaminhado', label: 'Encaminhado (hospital, clínica…)' }]
const nomeDesfecho = (v: unknown) => DESFECHOS.find((d) => d.value === v)?.label ?? '—'
const agora = () => { const d = new Date(); d.setSeconds(0, 0); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }

/* ------------ Painel ------------ */
function Painel({ ir }: { ir: (t: Tab) => void }) {
  const q = useGet<Row>('/saude/painel')
  if (q.isLoading) return <Loading />
  const p = q.data ?? {}
  return (
    <div className="grid">
      <Kpi label="Ocorrências em seguimento" value={String(p.ocorrencias_abertas ?? 0)} tone={Number(p.ocorrencias_abertas) ? 'warn' : undefined} onClick={() => ir('ocorrencias')} />
      <Kpi label="Ocorrências hoje" value={String(p.ocorrencias_hoje ?? 0)} onClick={() => ir('ocorrencias')} />
      <Kpi label="Medicação por autorizar" value={String(p.medicacao_por_autorizar ?? 0)} tone={Number(p.medicacao_por_autorizar) ? 'bad' : undefined} onClick={() => ir('medicacao')} />
      <Kpi label="Medicação em vigor" value={String(p.medicacao_activa ?? 0)} onClick={() => ir('medicacao')} />
      <Kpi label="Medicação a dar hoje" value={String(p.medicacao_por_dar_hoje ?? 0)} onClick={() => ir('medicacao')} />
      <Kpi label="Alunos com alergias" value={String(p.alunos_com_alergias ?? 0)} />
    </div>
  )
}

/* ------------ Ocorrências ------------ */
const ocorrenciaFields: FieldDef[] = [
  { name: 'aluno_id', label: 'Aluno', type: 'select', options: alunoOptions, required: true },
  { name: 'data_hora', label: 'Data e hora', type: 'text', required: true, placeholder: 'AAAA-MM-DDTHH:MM' },
  { name: 'local', label: 'Local', placeholder: 'Ex.: recreio, sala 3' },
  { name: 'descricao', label: 'O que aconteceu', type: 'textarea', required: true, wide: true },
  { name: 'sinais', label: 'Sinais observados', type: 'textarea', wide: true },
  { name: 'medidas', label: 'Medidas tomadas', type: 'textarea', wide: true, hint: 'Primeiros socorros, medicação dada…' },
  { name: 'encaminhamento', label: 'Encaminhamento', wide: true },
  { name: 'partilhada', label: 'Portal da família', type: 'checkbox', hint: 'Mostrar o relatório à família', default: false },
]
const notaFields: FieldDef[] = [
  { name: 'tipo', label: 'Tipo', type: 'select', required: true, default: 'nota',
    options: [{ value: 'nota', label: 'Nota' }, { value: 'contacto_familia', label: 'Contacto com a família' }] },
  { name: 'texto', label: 'Texto', type: 'textarea', required: true, wide: true },
  { name: 'canal', label: 'Canal', placeholder: 'Telefone, WhatsApp, presencial…', showIf: (v) => v.tipo === 'contacto_familia' },
  { name: 'contactado', label: 'Com quem se falou', showIf: (v) => v.tipo === 'contacto_familia' },
  { name: 'orientacao', label: 'O que a família indicou', wide: true, showIf: (v) => v.tipo === 'contacto_familia' },
]
const encerrarFields: FieldDef[] = [
  { name: 'desfecho', label: 'Desfecho', type: 'select', options: DESFECHOS, required: true },
  { name: 'nota', label: 'Nota final', type: 'textarea', wide: true },
]

function DetalheOcorrencia({ id, onClose }: { id: number; onClose: () => void }) {
  const q = useGet<Row>(`/saude/ocorrencias/${id}`)
  const [dlg, setDlg] = useState<'nota' | 'encerrar' | null>(null)
  const nota = useAct((p: Row) => api.post(`/saude/ocorrencias/${id}/notas`, p), { invalidate: INV, ok: 'Nota registada.', onDone: () => setDlg(null) })
  const encerrar = useAct((p: Row) => api.post(`/saude/ocorrencias/${id}/encerrar`, p), { invalidate: INV, ok: 'Ocorrência encerrada.', onDone: () => setDlg(null) })
  const partilhar = useAct((v: boolean) => api.patch(`/saude/ocorrencias/${id}`, { partilhada: v }), { invalidate: INV, ok: 'Alteração guardada.' })
  const o = q.data
  return (
    <Modal title="Ocorrência de saúde" size="lg" onClose={onClose} footer={o && <>
      <Btn variant="ghost" onClick={() => setDlg('nota')}>Acrescentar nota</Btn>
      {o.estado === 'aberta' && <Btn variant="ghost" onClick={() => partilhar.mutate(!o.partilhada)}>{o.partilhada ? 'Deixar de partilhar' : 'Partilhar com a família'}</Btn>}
      {o.estado === 'aberta' && <Btn onClick={() => setDlg('encerrar')}>Encerrar</Btn>}
    </>}>
      {!o ? <Loading /> : (
        <div className="stack">
          <table className="ficha-ident"><tbody>
            <tr><th>Aluno</th><td><b>{String(o.aluno)}</b></td></tr>
            <tr><th>Data e hora</th><td>{dataPT(o.data_hora, true)}{o.local ? ` · ${o.local}` : ''}</td></tr>
            <tr><th>O que aconteceu</th><td>{String(o.descricao)}</td></tr>
            <tr><th>Sinais</th><td>{String(o.sinais ?? '—')}</td></tr>
            <tr><th>Medidas tomadas</th><td>{String(o.medidas ?? '—')}</td></tr>
            <tr><th>Encaminhamento</th><td>{String(o.encaminhamento ?? '—')}</td></tr>
            <tr><th>Estado</th><td>{o.estado === 'aberta' ? <Tag tone="wa">Em seguimento</Tag> : <Tag tone="ok">Encerrada · {nomeDesfecho(o.desfecho)}</Tag>}
              {' '}{o.partilhada ? <Tag tone="n">Partilhada com a família</Tag> : null}</td></tr>
            <tr><th>Registada por</th><td>{String(o.registada_por_nome ?? '—')}</td></tr>
          </tbody></table>
          <h4 className="ficha-tit">REGISTO</h4>
          <Table rows={asList(o.notas)} pageSize={0} empty="Sem notas." cols={[
            { h: 'Quando', render: (n) => dataPT(n.em, true) },
            { h: 'Tipo', render: (n) => (n.tipo === 'contacto_familia' ? 'Contacto com a família' : n.tipo === 'nota' ? 'Nota' : String(n.tipo)) },
            { h: 'Texto', nowrap: false, render: (n) => <>{String(n.texto)}{n.canal ? ` (${n.canal}${n.contactado ? `, ${n.contactado}` : ''})` : ''}{n.orientacao ? ` — ${n.orientacao}` : ''}</> },
            { h: 'Por', render: (n) => String(n.por_nome ?? '') },
          ]} />
        </div>
      )}
      {dlg === 'nota' && <FormDialog title="Acrescentar nota" fields={notaFields} onSubmit={(p) => nota.mutateAsync(p)} onClose={() => setDlg(null)} />}
      {dlg === 'encerrar' && <FormDialog title="Encerrar ocorrência" fields={encerrarFields} submitLabel="Encerrar" onSubmit={(p) => encerrar.mutateAsync(p)} onClose={() => setDlg(null)} />}
    </Modal>
  )
}

function Ocorrencias() {
  const [estado, setEstado] = useState('')
  const [nova, setNova] = useState(false)
  const [ver, setVer] = useState<number | null>(null)
  const q = useList('/saude/ocorrencias', { estado })
  const criar = useAct((p: Row) => api.post('/saude/ocorrencias', p), { invalidate: INV, ok: 'Ocorrência registada.', onDone: () => setNova(false) })
  return (
    <>
      <Toolbar>
        <Select label="Estado" value={estado} onChange={setEstado} placeholder="Todas" options={[{ value: 'aberta', label: 'Em seguimento' }, { value: 'encerrada', label: 'Encerradas' }]} />
        <span className="grow" />
        <Btn onClick={() => setNova(true)}>Nova ocorrência</Btn>
      </Toolbar>
      <Table rows={q.rows} loading={q.isLoading} error={q.error} onRetry={() => q.refetch()} onRow={(r) => setVer(Number(r.id))}
        empty="Não há ocorrências de saúde." cols={[
          { h: 'Data', render: (r) => dataPT(r.data_hora, true) },
          { h: 'Aluno', k: 'aluno' },
          { h: 'O que aconteceu', k: 'descricao', nowrap: false },
          { h: 'Estado', render: (r) => (r.estado === 'aberta' ? <Tag tone="wa">Em seguimento</Tag> : <Tag tone="ok">{nomeDesfecho(r.desfecho)}</Tag>) },
          { h: 'Família', render: (r) => (r.partilhada ? <Tag tone="n">Partilhada</Tag> : '') },
        ]} />
      {nova && <FormDialog title="Nova ocorrência de saúde" fields={ocorrenciaFields} initial={{ data_hora: agora(), partilhada: false }} size="lg"
        onSubmit={(p) => criar.mutateAsync(p)} onClose={() => setNova(false)} />}
      {ver && <DetalheOcorrencia id={ver} onClose={() => setVer(null)} />}
    </>
  )
}

/* ------------ Medicação ------------ */
const ESTADO_MED: Record<string, [Tone, string]> = {
  pendente: ['wa', 'Por autorizar'], autorizada: ['ok', 'Autorizada'], recusada: ['er', 'Recusada'], terminada: ['n', 'Terminada'],
}
const medicacaoFields: FieldDef[] = [
  { name: 'aluno_id', label: 'Aluno', type: 'select', options: alunoOptions, required: true },
  { name: 'medicamento', label: 'Medicamento', required: true },
  { name: 'dose', label: 'Dose', required: true },
  { name: 'horario', label: 'Quando dar', required: true, wide: true, placeholder: 'Ex.: 12:30, ou se tiver febre acima de 38 graus' },
  { name: 'data_inicio', label: 'Desde', type: 'date', required: true },
  { name: 'data_fim', label: 'Até', type: 'date' },
  { name: 'instrucoes', label: 'Outras instruções', type: 'textarea', wide: true },
]
const administracaoFields: FieldDef[] = [
  { name: 'administrada', label: 'Tomou', type: 'checkbox', default: true, hint: 'Desmarque se o aluno não tomou (recusou, faltou…)' },
  { name: 'dose', label: 'Dose dada', hint: 'Em branco: a dose da instrução' },
  { name: 'observacao', label: 'Observação', type: 'textarea', wide: true },
]

function Medicacao() {
  const [filtro, setFiltro] = useState('pendente')
  const [nova, setNova] = useState(false)
  const [recusar, setRecusar] = useState<Row | null>(null)
  const [dar, setDar] = useState<Row | null>(null)
  const [historico, setHistorico] = useState<Row | null>(null)
  const params = filtro === 'activas' ? { activas: true } : { estado: filtro }
  const q = useList('/saude/medicacao', params)
  const criar = useAct((p: Row) => api.post('/saude/medicacao', p), { invalidate: INV, ok: 'Instrução registada (fica por autorizar).', onDone: () => setNova(false) })
  const decidir = useAct((v: { id: unknown; autorizar: boolean; motivo?: string }) => api.post(`/saude/medicacao/${v.id}/decidir`, { autorizar: v.autorizar, motivo: v.motivo }),
    { invalidate: INV, ok: (_r, v) => (v.autorizar ? 'Medicação autorizada. A família foi avisada.' : 'Medicação recusada. A família foi avisada.'), onDone: () => setRecusar(null) })
  const administrar = useAct((p: Row) => api.post(`/saude/medicacao/${dar!.id}/administracoes`, p), { invalidate: INV, ok: 'Administração registada.', onDone: () => setDar(null) })
  const terminar = useAct((id: unknown) => api.post(`/saude/medicacao/${id}/terminar`), { invalidate: INV, ok: 'Instrução terminada.' })
  return (
    <>
      <Toolbar>
        <Select label="Mostrar" value={filtro} onChange={setFiltro} options={[
          { value: 'pendente', label: 'Por autorizar' }, { value: 'activas', label: 'Em vigor hoje' }, { value: 'autorizada', label: 'Autorizadas' },
          { value: 'recusada', label: 'Recusadas' }, { value: 'terminada', label: 'Terminadas' }]} />
        <span className="grow" />
        <Btn variant="ghost" onClick={() => setNova(true)}>Registar instrução em papel</Btn>
      </Toolbar>
      <Table rows={q.rows} loading={q.isLoading} error={q.error} onRetry={() => q.refetch()} empty="Nada a mostrar." cols={[
        { h: 'Aluno', k: 'aluno' },
        { h: 'Medicamento', render: (r) => <><b>{String(r.medicamento)}</b> · {String(r.dose)}</> },
        { h: 'Quando', k: 'horario', nowrap: false },
        { h: 'Período', render: (r) => (r.data_fim ? `${dataPT(r.data_inicio)} a ${dataPT(r.data_fim)}` : `Desde ${dataPT(r.data_inicio)}`) },
        { h: 'Receita', render: (r) => (r.receita_url ? <a href={String(r.receita_url)} target="_blank" rel="noreferrer">Ver</a> : '—') },
        { h: 'Estado', render: (r) => { const [t, l] = ESTADO_MED[String(r.estado)] ?? (['n', String(r.estado)] as [Tone, string]); return <Tag tone={t}>{l}</Tag> } },
        { h: '', render: (r) => (
          <span className="row-a">
            {r.estado === 'pendente' && <Btn size="sm" busy={decidir.isPending} onClick={() => decidir.mutate({ id: r.id, autorizar: true })}>Autorizar</Btn>}
            {r.estado === 'pendente' && <Btn size="sm" variant="ghost" onClick={() => setRecusar(r)}>Recusar</Btn>}
            {r.estado === 'autorizada' && <Btn size="sm" onClick={() => setDar(r)}>Dar</Btn>}
            {r.estado === 'autorizada' && <Btn size="sm" variant="ghost" onClick={() => terminar.mutate(r.id)}>Terminar</Btn>}
            {asList(r.administracoes).length > 0 && <Btn size="sm" variant="link" onClick={() => setHistorico(r)}>Histórico</Btn>}
          </span>
        ) },
      ]} />
      {nova && <FormDialog title="Instrução de medicação entregue em papel" fields={medicacaoFields} onSubmit={(p) => criar.mutateAsync(p)} onClose={() => setNova(false)} />}
      {recusar && <FormDialog title={`Recusar: ${recusar.medicamento} (${recusar.aluno})`} submitLabel="Recusar"
        fields={[{ name: 'motivo', label: 'Motivo (a família é avisada)', type: 'textarea', required: true, wide: true }]}
        onSubmit={(p) => decidir.mutateAsync({ id: recusar.id, autorizar: false, motivo: String(p.motivo) })} onClose={() => setRecusar(null)} />}
      {dar && <FormDialog title={`Dar ${dar.medicamento} a ${dar.aluno}`} fields={administracaoFields} submitLabel="Registar"
        onSubmit={(p) => administrar.mutateAsync(p)} onClose={() => setDar(null)} />}
      {historico && (
        <Modal title={`Administrações: ${historico.medicamento} (${historico.aluno})`} onClose={() => setHistorico(null)}>
          <Table rows={asList(historico.administracoes)} pageSize={0} cols={[
            { h: 'Quando', render: (a) => dataPT(a.administrada_em, true) },
            { h: 'Dose', k: 'dose' },
            { h: 'Tomou', render: (a) => (a.administrada ? 'Sim' : <Tag tone="er">Não</Tag>) },
            { h: 'Observação', render: (a) => String(a.observacao ?? ''), nowrap: false },
            { h: 'Por', render: (a) => String(a.por_nome ?? '') },
          ]} />
        </Modal>
      )}
    </>
  )
}

type Tab = 'painel' | 'ocorrencias' | 'medicacao'

export default function Saude() {
  const [tab, setTab] = useState<Tab>('painel')
  return (
    <>
      <PageHead title="Saúde escolar" />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[['painel', 'Painel'], ['ocorrencias', 'Ocorrências'], ['medicacao', 'Medicação']]} />
      {tab === 'painel' && <Card><Painel ir={setTab} /></Card>}
      {tab === 'ocorrencias' && <Ocorrencias />}
      {tab === 'medicacao' && <Medicacao />}
    </>
  )
}
