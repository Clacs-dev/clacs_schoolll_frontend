import { useState } from 'react'
import { Link } from 'react-router'
import { FormDialog, type FieldDef } from '@/components/FormDialog'
import { Resource } from '@/components/Resource'
import { Table } from '@/components/Table'
import { Btn, Card, Kpi, Loading, PageHead, Select, Tabs, Tag, Toolbar } from '@/components/ui'
import { classeOptions, turmaOptions } from '@/lib/academic'
import { api } from '@/lib/api'
import { asList, type Row } from '@/lib/data'
import { dataPT, type Tone } from '@/lib/format'
import { useAct, useGet, useList } from '@/lib/hooks'
import { useOptions } from '@/components/FormDialog'

type Tab = 'painel' | 'validar' | 'falta' | 'contactos' | 'exigidos' | 'modelos'

/* ------------ Painel ------------ */
const SERVICOS: Record<string, string> = { secretaria: 'Secretaria', coordenacao: 'Coordenação', tesouraria: 'Tesouraria', direccao: 'Direcção', saude: 'Saúde' }

function Painel({ ir }: { ir: (t: Tab) => void }) {
  const q = useGet<Row>('/secretaria/painel')
  if (q.isLoading) return <Loading />
  const p = q.data ?? {}
  const n = (k: string) => Number(p[k] ?? 0)
  return (
    <div className="stack">
      <div className="grid">
        <Kpi label="Documentos por validar" value={n('documentos_por_validar')} tone={n('documentos_por_validar') ? 'warn' : undefined} onClick={() => ir('validar')} />
        <Kpi label="Alunos com documentos em falta" value={n('alunos_com_documentos_em_falta')} tone={n('alunos_com_documentos_em_falta') ? 'warn' : undefined} onClick={() => ir('falta')} />
        <Kpi label="Pedidos em aberto" value={n('pedidos_abertos')} hint={`${n('aguardam_familia')} a aguardar a família`} />
        <Kpi label="Declarações por emitir" value={n('declaracoes_por_emitir')} hint={`${n('declaracoes_por_entregar')} por entregar`} />
        <Kpi label="Renovações pendentes" value={n('renovacoes_pendentes')} />
        <Kpi label="Transferências pendentes" value={n('transferencias_pendentes')} />
        <Kpi label="Candidaturas em curso" value={n('candidaturas_em_curso')} />
      </div>
      {Object.keys(p.pedidos_por_servico ?? {}).length > 0 && (
        <Card title="Pedidos em aberto por serviço">
          <div className="row-a" style={{ flexWrap: 'wrap' }}>
            {Object.entries(p.pedidos_por_servico as Record<string, number>).map(([s, v]) => <Tag key={s} tone="n">{SERVICOS[s] ?? s}: {v}</Tag>)}
          </div>
          <p className="note">Trate os pedidos em <Link to="/pedidos">Pedidos e declarações</Link>.</p>
        </Card>
      )}
    </div>
  )
}

/* ------------ Validar documentos entregues ------------ */
const ESTADO_DOC: Record<string, [Tone, string]> = { recebido: ['wa', 'Por validar'], aceite: ['ok', 'Aceite'], rejeitado: ['er', 'Rejeitado'] }

function Validar() {
  const [estado, setEstado] = useState('recebido')
  const [rejeitar, setRejeitar] = useState<Row | null>(null)
  const q = useList('/documentos', { estado })
  const validar = useAct((v: { r: Row; estado: string; observacao?: string }) =>
    api.post(`/alunos/${v.r.aluno_id}/documentos/${v.r.id}/validar`, { estado: v.estado, observacao: v.observacao }),
  { invalidate: ['/documentos', '/secretaria'], ok: (_r, v) => (v.estado === 'aceite' ? 'Documento aceite.' : 'Documento rejeitado. A família foi avisada.'), onDone: () => setRejeitar(null) })
  return (
    <>
      <Toolbar>
        <Select label="Estado" value={estado} onChange={setEstado} placeholder="Todos" options={[
          { value: 'recebido', label: 'Por validar' }, { value: 'aceite', label: 'Aceites' }, { value: 'rejeitado', label: 'Rejeitados' }]} />
      </Toolbar>
      <Table rows={q.rows} loading={q.isLoading} error={q.error} onRetry={() => q.refetch()} empty="Não há documentos neste estado." cols={[
        { h: 'Entregue', render: (r) => dataPT(r.criado_em) },
        { h: 'Aluno', k: 'aluno' },
        { h: 'Documento', k: 'nome_tipo' },
        { h: 'Ficheiro', render: (r) => <a href={String(r.ficheiro_url)} target="_blank" rel="noreferrer">Abrir</a> },
        { h: 'Estado', render: (r) => { const [t, l] = ESTADO_DOC[String(r.estado)] ?? (['n', String(r.estado)] as [Tone, string]); return <Tag tone={t}>{l}</Tag> } },
        { h: 'Observação', render: (r) => String(r.observacao ?? ''), nowrap: false },
        { h: '', render: (r) => (r.estado === 'recebido' ? (
          <span className="row-a">
            <Btn size="sm" onClick={() => validar.mutate({ r, estado: 'aceite' })}>Aceitar</Btn>
            <Btn size="sm" variant="ghost" onClick={() => setRejeitar(r)}>Rejeitar</Btn>
          </span>
        ) : null) },
      ]} />
      {rejeitar && <FormDialog title={`Rejeitar: ${rejeitar.nome_tipo} (${rejeitar.aluno})`} submitLabel="Rejeitar"
        fields={[{ name: 'observacao', label: 'Motivo (a família é avisada)', type: 'textarea', required: true, wide: true }]}
        onSubmit={(p) => validar.mutateAsync({ r: rejeitar, estado: 'rejeitado', observacao: String(p.observacao) })} onClose={() => setRejeitar(null)} />}
    </>
  )
}

/* ------------ Documentos em falta ------------ */
function EmFalta() {
  const [turma, setTurma] = useState('')
  const { opts: turmas } = useOptions(turmaOptions)
  const q = useList('/documentos/em-falta', { turma_id: turma })
  const avisar = useAct(() => api.post('/documentos/em-falta/avisar', { turma_id: turma ? Number(turma) : undefined }),
    { invalidate: ['/documentos'], ok: (r: Row) => `${r.avisados} encarregado(s) avisado(s) sobre ${r.alunos} aluno(s).` })
  return (
    <>
      <Toolbar>
        <Select label="Turma" value={turma} onChange={setTurma} placeholder="Todas as turmas" options={turmas} />
        <span className="grow" />
        <Btn disabled={!q.rows.length} busy={avisar.isPending} onClick={() => avisar.mutate()}>Avisar as famílias</Btn>
      </Toolbar>
      <Table rows={q.rows} rowKey={(r) => String(r.aluno_id)} loading={q.isLoading} error={q.error} onRetry={() => q.refetch()}
        empty="Nenhum aluno com documentos em falta." cols={[
          { h: 'Aluno', render: (r) => <Link to={`/alunos/${r.aluno_id}`}>{String(r.aluno)}</Link> },
          { h: 'Processo', k: 'numero_processo' },
          { h: 'Turma', render: (r) => String(r.turma ?? '—') },
          { h: 'Em falta', nowrap: false, render: (r) => asList(r.em_falta).map((d) => <Tag key={String(d.tipo)} tone={d.obrigatorio ? 'wa' : 'n'}>{String(d.nome)}</Tag>) },
          { h: 'Por validar', render: (r) => (Number(r.por_validar) ? <Tag tone="wa">{String(r.por_validar)}</Tag> : '') },
        ]} />
    </>
  )
}

/* ------------ Contactos com problemas ------------ */
function Contactos() {
  const q = useList('/contactos/avisos')
  return (
    <Table rows={q.rows} rowKey={(r) => String(r.aluno_id)} loading={q.isLoading} error={q.error} onRetry={() => q.refetch()}
      empty="Todos os alunos têm os contactos em ordem." cols={[
        { h: 'Aluno', render: (r) => <Link to={`/alunos/${r.aluno_id}`}>{String(r.aluno)}</Link> },
        { h: 'O que corrigir', nowrap: false, render: (r) => <ul className="ficha-lista">{asList(r.avisos).map((a, i) => <li key={i}>{String(a)}</li>)}</ul> },
      ]} />
  )
}

/* ------------ Documentos exigidos ------------ */
const exigidoFields: FieldDef[] = [
  { name: 'nome', label: 'Documento', required: true, wide: true, placeholder: 'Ex.: Boletim de vacinas' },
  { name: 'tipo', label: 'Código', required: true, placeholder: 'Ex.: boletim_vacinas', hint: 'Só letras minúsculas, números e _' },
  { name: 'classe_id', label: 'Classe', type: 'select', options: classeOptions, hint: 'Em branco: todas as classes' },
  { name: 'obrigatorio', label: 'Obrigatório', type: 'checkbox', default: true },
  { name: 'activo', label: 'Activo', type: 'checkbox', default: true },
]

function Exigidos() {
  const classes = useList('/classes')
  return (
    <Resource path="/documentos-exigidos" invalidate={['/documentos-exigidos', '/documentos']} createLabel="Novo documento exigido"
      createFields={exigidoFields} editFields={exigidoFields.filter((f) => f.name !== 'tipo')} editPath={(r) => `/documentos-exigidos/${r.id}`}
      deletePath={(r) => `/documentos-exigidos/${r.id}`} deleteName={(r) => String(r.nome)} pageSize={0}
      empty="Ainda não há documentos exigidos." cols={[
        { h: 'Documento', k: 'nome' },
        { h: 'Código', k: 'tipo' },
        { h: 'Classe', render: (r) => String(classes.rows.find((c) => c.id === r.classe_id)?.designacao ?? 'Todas') },
        { h: 'Obrigatório', render: (r) => (r.obrigatorio ? 'Sim' : 'Não') },
        { h: 'Estado', render: (r) => (r.activo ? <Tag tone="ok">Activo</Tag> : <Tag>Inactivo</Tag>) },
      ]} />
  )
}

/* ------------ Modelos de declaração ------------ */
function Modelos() {
  const vars = useList('/modelos-declaracao/variaveis')
  const ajuda = vars.rows.map((v) => `{${String(v.variavel).replace(/[{}]/g, '')}}`).join(' ')
  const fields: FieldDef[] = [
    { name: 'nome', label: 'Nome', required: true, wide: true, placeholder: 'Ex.: Declaração de matrícula' },
    { name: 'codigo', label: 'Código', required: true, placeholder: 'Ex.: matricula', hint: 'Só letras minúsculas, números e _' },
    { name: 'activo', label: 'Activo', type: 'checkbox', default: true },
    { name: 'texto', label: 'Texto da declaração', type: 'textarea', required: true, wide: true, hint: ajuda ? `Variáveis: ${ajuda}` : undefined },
  ]
  const [ver, setVer] = useState<Row | null>(null)
  return (
    <>
      <Resource path="/modelos-declaracao" invalidate={['/modelos-declaracao']} createLabel="Novo modelo" createFields={fields}
        editFields={fields.filter((f) => f.name !== 'codigo')} editPath={(r) => `/modelos-declaracao/${r.id}`}
        deletePath={(r) => `/modelos-declaracao/${r.id}`} deleteName={(r) => String(r.nome)} pageSize={0}
        rowActions={(r) => <Btn variant="link" onClick={() => setVer(r)}>Ver texto</Btn>}
        empty="Ainda não há modelos de declaração." cols={[
          { h: 'Modelo', k: 'nome' },
          { h: 'Código', k: 'codigo' },
          { h: 'Estado', render: (r) => (r.activo ? <Tag tone="ok">Activo</Tag> : <Tag>Inactivo</Tag>) },
        ]} />
      {ver && <FormDialog title={String(ver.nome)} fields={[{ name: 'texto', label: 'Texto', type: 'textarea', wide: true, readOnly: true }]}
        initial={ver} submitLabel="Fechar" onSubmit={() => setVer(null)} onClose={() => setVer(null)} />}
    </>
  )
}

export default function Secretaria() {
  const [tab, setTab] = useState<Tab>('painel')
  return (
    <>
      <PageHead title="Secretaria" />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        ['painel', 'Painel'], ['validar', 'Validar documentos'], ['falta', 'Documentos em falta'], ['contactos', 'Contactos a corrigir'],
        ['exigidos', 'Documentos exigidos'], ['modelos', 'Modelos de declaração'],
      ]} />
      {tab === 'painel' && <Painel ir={setTab} />}
      {tab === 'validar' && <Validar />}
      {tab === 'falta' && <EmFalta />}
      {tab === 'contactos' && <Contactos />}
      {tab === 'exigidos' && <Exigidos />}
      {tab === 'modelos' && <Modelos />}
    </>
  )
}
