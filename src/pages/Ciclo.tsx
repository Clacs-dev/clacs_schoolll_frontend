import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { FormDialog, type FieldDef } from '@/components/FormDialog'
import { ResultDialog, useConfirm } from '@/components/Modal'
import { Resource } from '@/components/Resource'
import { Table } from '@/components/Table'
import { Btn, Card, Empty, Estado, Loading, PageHead, Select, Tabs, Tag } from '@/components/ui'
import { api } from '@/lib/api'
import { num, pick, type Row } from '@/lib/data'
import { disciplinaOptions, funcionarioOptions, isActivo, salaOptions } from '@/lib/academic'
import { estadoCiclo, nomeCiclo, useCiclos } from '@/lib/ciclos'
import { dataPT, label } from '@/lib/format'
import { useAct, useList } from '@/lib/hooks'
import { Atribuicoes, comuns, createFields as turmaCreateFields } from './Turmas'
import { Periodos, Resultados, Transitar } from './Academico'

type Tab = 'plano' | 'turmas' | 'horarios' | 'cargas'

const hoje = () => new Date().toISOString().slice(0, 10)
const hora = (v: unknown) => String(v ?? '').slice(0, 5)

/* ------------ Plano de actividade ------------ */
const TIPOS_ACTIVIDADE = [
  { value: 'evento', label: 'Actividade / evento' }, { value: 'reuniao', label: 'Reunião' }, { value: 'prova', label: 'Prova / exame' },
  { value: 'feriado', label: 'Feriado' }, { value: 'interrupcao', label: 'Interrupção lectiva' },
]
const actividadeFields: FieldDef[] = [
  { name: 'titulo', label: 'Actividade', required: true, wide: true, placeholder: 'Ex.: Reunião de pais do 1.º trimestre' },
  { name: 'tipo', label: 'Tipo', type: 'select', options: TIPOS_ACTIVIDADE, default: 'evento', required: true },
  { name: 'data_inicio', label: 'Início', type: 'date', required: true },
  { name: 'data_fim', label: 'Fim', type: 'date', hint: 'Em branco: um só dia' },
  { name: 'descricao', label: 'Descrição', type: 'textarea', wide: true },
  { name: 'publico', label: 'Portal das famílias', type: 'checkbox', hint: 'Mostrar às famílias', default: true },
]

function Plano({ c }: { c: Row }) {
  return (
    <Resource
      path="/eventos"
      params={{ desde: pick(c, 'data_inicio'), ate: pick(c, 'data_fim') }}
      invalidate={['/eventos']}
      createLabel="Nova actividade"
      createFields={actividadeFields}
      createInitial={{ data_inicio: pick(c, 'data_inicio') }}
      crud="/eventos"
      search
      empty="O plano de actividades deste ciclo ainda está vazio."
      cols={[
        { h: 'Data', render: (r) => (r.data_fim && r.data_fim !== r.data_inicio ? `${dataPT(r.data_inicio)} a ${dataPT(r.data_fim)}` : dataPT(r.data_inicio)) },
        { h: 'Actividade', k: 'titulo' },
        { h: 'Tipo', render: (r) => TIPOS_ACTIVIDADE.find((t) => t.value === r.tipo)?.label ?? label(r.tipo) },
        { h: 'Famílias', render: (r) => (r.publico === false ? <Tag>Interna</Tag> : <Tag tone="ok">Visível</Tag>) },
      ]}
    />
  )
}

/* ------------ Turmas ------------ */
function Turmas({ c }: { c: Row }) {
  const [at, setAt] = useState<Row | null>(null)
  return (
    <>
      <Resource
        path="/turmas"
        params={{ ano_id: c.id }}
        invalidate={['/turmas']}
        search
        createLabel="Nova turma"
        createFields={turmaCreateFields}
        beforeCreate={(p) => ({ ...p, ano_id: c.id })}
        editFields={comuns}
        editPath={(r) => `/turmas/${r.id}`}
        deletePath={(r) => `/turmas/${r.id}`}
        empty="Este ciclo ainda não tem turmas."
        cols={[
          { h: 'Turma', k: ['designacao', 'nome'] },
          { h: 'Classe', k: ['classe', 'classe_designacao', 'classe.designacao'] },
          { h: 'Sala', k: ['sala', 'sala_designacao', 'sala.designacao'] },
          { h: 'Período', render: (r) => label(pick(r, 'periodo_dia')) },
          { h: 'Alunos', render: (r) => `${num(pick(r, 'alunos', 'total_alunos', 'matriculados'))}/${num(pick(r, 'capacidade')) || '—'}` },
        ]}
        rowActions={(r) => <Btn variant="link" onClick={() => setAt(r)}>Disciplinas</Btn>}
      />
      {at && <Atribuicoes t={at} onClose={() => setAt(null)} />}
    </>
  )
}

/* ------------ Horários ------------ */
const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((l, i) => ({ value: i + 1, label: l }))

/** Data em que se consulta o horário: hoje, se cair dentro do ciclo; senão o início (ciclo futuro) ou o fim (ciclo passado). */
function dataDoCiclo(c: Row) {
  const d = hoje()
  const ini = String(pick(c, 'data_inicio') ?? '')
  const fim = String(pick(c, 'data_fim') ?? '')
  if (ini && d < ini) return ini
  if (fim && d > fim) return fim
  return d
}

/** Mapa de horário da turma: uma linha por intervalo de horas, uma coluna por dia; cada célula com a disciplina e o professor. */
function MapaHorario({ rows, turma, onRetirar }: { rows: Row[]; turma: string; onRetirar: (r: Row) => void }) {
  const discs = useList('/disciplinas')
  const sigla = (r: Row) => {
    const d = discs.rows.find((x) => x.id === r.disciplina_id)
    return String(pick(d, 'sigla') || r.disciplina || '').toUpperCase()
  }
  const primeiroNome = (n: unknown) => String(n ?? '').trim().split(/\s+/)[0] ?? ''
  const dias = DIAS.filter((d) => d.value <= 5 || rows.some((r) => r.dia_semana === d.value))
  const faixas = [...new Map(rows.map((r) => [`${hora(r.hora_inicio)}–${hora(r.hora_fim)}`, r])).keys()].sort()
  const celula = (faixa: string, dia: number) => rows.filter((r) => r.dia_semana === dia && `${hora(r.hora_inicio)}–${hora(r.hora_fim)}` === faixa)

  return (
    <div className="mapa-horario">
      <table>
        <caption>Horário da turma {turma}</caption>
        <thead>
          <tr><th scope="col">Horas / dias</th>{dias.map((d) => <th key={d.value} scope="col">{d.label}</th>)}</tr>
        </thead>
        <tbody>
          {faixas.map((f) => (
            <tr key={f}>
              <th scope="row">{f}</th>
              {dias.map((d) => (
                <td key={d.value}>
                  {celula(f, d.value).map((r) => (
                    <button type="button" key={r.id} className="mh-aula" title={`${r.disciplina}${r.professor ? ` — ${r.professor}` : ''} (clique para retirar)`} onClick={() => onRetirar(r)}>
                      <b>{sigla(r)}</b>
                      <span>{primeiroNome(r.professor).toUpperCase() || '—'}</span>
                    </button>
                  ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note" style={{ margin: '8px 0 0' }}>Clique numa aula para a retirar do horário. Passe o rato por cima para ver o nome completo.</p>
    </div>
  )
}

function Horarios({ c }: { c: Row }) {
  const confirm = useConfirm()
  const turmas = useList('/turmas', { ano_id: c.id })
  const [turma, setTurma] = useState('')
  const [novo, setNovo] = useState(false)
  const data = dataDoCiclo(c)
  const q = useList(turma ? '/horarios' : null, { turma_id: turma, data })
  const criar = useAct((p: Row) => api.post('/horarios', { ...p, turma_id: Number(turma) }), { invalidate: ['/horarios'], ok: 'Tempo lectivo criado.' })
  const terminar = useAct((id: number) => api.post(`/horarios/${id}/terminar`), { invalidate: ['/horarios'], ok: 'Tempo lectivo retirado do horário.' })
  const futuro = data > hoje()

  const campos: FieldDef[] = [
    { name: 'disciplina_id', label: 'Disciplina', type: 'select', options: disciplinaOptions, required: true },
    { name: 'funcionario_id', label: 'Professor', type: 'select', options: { ...funcionarioOptions, params: { cargo: 'professor' } } },
    { name: 'dia_semana', label: 'Dia', type: 'select', options: DIAS, required: true },
    { name: 'tempo', label: 'Tempo', type: 'number', min: 1, max: 12, required: true, hint: '1.º, 2.º… tempo do dia' },
    { name: 'hora_inicio', label: 'Início', type: 'time', required: true },
    { name: 'hora_fim', label: 'Fim', type: 'time', required: true },
    { name: 'sala_id', label: 'Sala', type: 'select', options: salaOptions },
    { name: 'valido_desde', label: 'Em vigor desde', type: 'date', default: futuro ? data : undefined, hint: 'Em branco: hoje' },
  ]

  return (
    <section>
      <div className="toolbar">
        <Select label="Turma" value={turma} onChange={setTurma} placeholder={turmas.isLoading ? 'A carregar…' : 'Escolha a turma'}
          options={turmas.rows.map((t) => ({ value: t.id, label: String(pick(t, 'designacao')) }))} />
        <span className="grow" />
        {turma && <Btn onClick={() => setNovo(true)}>Novo tempo lectivo</Btn>}
      </div>
      {!turmas.isLoading && !turmas.rows.length ? <Empty>Crie primeiro as turmas deste ciclo.</Empty>
        : !turma ? <Empty>Escolha uma turma para ver o horário.</Empty>
          : (
            q.isLoading ? <Loading /> : !q.rows.length ? <Empty>Esta turma ainda não tem horário.</Empty> : (
              <MapaHorario rows={q.rows} turma={String(pick(turmas.rows.find((t) => String(t.id) === turma), 'designacao') ?? '')}
                onRetirar={async (r) => {
                  if (await confirm({ title: 'Retirar do horário', text: `Retirar ${r.disciplina} (${DIAS.find((d) => d.value === r.dia_semana)?.label}, ${hora(r.hora_inicio)}–${hora(r.hora_fim)}) do horário? Fica no histórico.`, yes: 'Retirar' })) terminar.mutate(r.id)
                }} />
            )
          )}
      {novo && <FormDialog title="Novo tempo lectivo" fields={campos} onClose={() => setNovo(false)} onSubmit={(p) => criar.mutateAsync(p)} />}
    </section>
  )
}

/* ------------ Cargas horárias ------------ */
function CargasClasse({ classe }: { classe: Row }) {
  const q = useList(`/classes/${classe.id}/disciplinas`)
  const [novo, setNovo] = useState(false)
  const assoc = useAct((p: Row) => api.post(`/classes/${classe.id}/disciplinas`, p), { invalidate: [`/classes/${classe.id}`], ok: 'Disciplina associada.' })
  const total = q.rows.reduce((s, r) => s + num(r.carga_horaria), 0)
  return (
    <Card title={`${pick(classe, 'designacao', 'nome')}${total ? ` · ${total} tempos por semana` : ''}`} actions={<Btn variant="ghost" size="sm" onClick={() => setNovo(true)}>Associar disciplina</Btn>}>
      {q.isLoading ? <Loading /> : (
        <Table rows={q.rows} pageSize={0} empty="Sem disciplinas nesta classe." cols={[
          { h: 'Disciplina', k: ['nome', 'disciplina'] }, { h: 'Sigla', k: 'sigla' },
          { h: 'Carga horária semanal', render: (r) => (r.carga_horaria ? `${r.carga_horaria} tempos` : '—') },
        ]} />
      )}
      {novo && <FormDialog title={`Associar disciplina — ${pick(classe, 'designacao')}`} size="sm" onClose={() => setNovo(false)} onSubmit={(p) => assoc.mutateAsync(p)} fields={[
        { name: 'disciplina_id', label: 'Disciplina', type: 'select', options: disciplinaOptions, required: true, wide: true },
        { name: 'carga_horaria', label: 'Carga horária semanal (tempos)', type: 'number', min: 1 },
      ]} />}
    </Card>
  )
}

function Cargas({ c }: { c: Row }) {
  const turmas = useList('/turmas', { ano_id: c.id })
  const classes = useList('/classes')
  if (turmas.isLoading || classes.isLoading) return <Loading />
  const doCiclo = new Set(turmas.rows.map((t) => t.classe_id))
  const lista = classes.rows.filter((k) => doCiclo.has(k.id))
  return (
    <>
      <p className="note" style={{ margin: '0 0 12px' }}>Carga horária semanal de cada disciplina, por classe das turmas deste ciclo. A carga é definida na classe.</p>
      {lista.length ? <div style={{ display: 'grid', gap: 16 }}>{lista.map((k) => <CargasClasse key={k.id} classe={k} />)}</div>
        : <Empty>Este ciclo ainda não tem turmas. As cargas horárias aparecem por classe depois de criar as turmas.</Empty>}
    </>
  )
}

/* ------------ Gestão do ciclo (antes em "Anos lectivos") ------------ */
function AccoesCiclo({ c, ciclos }: { c: Row; ciclos: Row[] }) {
  const confirm = useConfirm()
  const [dlg, setDlg] = useState<'per' | 'res' | 'trans' | null>(null)
  const [fecho, setFecho] = useState<unknown>()
  const activar = useAct(() => api.post(`/anos-lectivos/${c.id}/activar`), { invalidate: ['/anos-lectivos', '/turmas', '/matriculas'], ok: 'Ciclo activado.' })
  const fechar = useAct((simular: boolean) => api.post(`/anos-lectivos/${c.id}/fechar`, undefined, { simular }), {
    invalidate: ['/anos-lectivos'], silent: true, onDone: (r, simular) => setFecho({ ...r, _simulacao: simular }),
  })
  return (
    <>
      <div className="row-a" style={{ flexWrap: 'wrap' }}>
        {!isActivo(c) && <Btn variant="ghost" size="sm" busy={activar.isPending} onClick={() => activar.mutate()}>Activar</Btn>}
        <Btn variant="ghost" size="sm" onClick={() => setDlg('per')}>Períodos</Btn>
        <Btn variant="ghost" size="sm" onClick={() => setDlg('trans')}>Transitar alunos</Btn>
        <Btn variant="ghost" size="sm" busy={fechar.isPending} onClick={() => fechar.mutate(true)}>Simular fecho</Btn>
        <Btn variant="ghost" size="sm" onClick={async () => {
          if (await confirm({ title: 'Fechar ciclo', text: `Gravar as médias finais e a situação dos alunos do ciclo ${nomeCiclo(c)}?`, yes: 'Fechar ciclo' })) fechar.mutate(false)
        }}>Fechar ciclo</Btn>
        <Btn variant="ghost" size="sm" onClick={() => setDlg('res')}>Resultados</Btn>
      </div>
      {dlg === 'per' && <Periodos ano={c} onClose={() => setDlg(null)} />}
      {dlg === 'res' && <Resultados ano={c} onClose={() => setDlg(null)} />}
      {dlg === 'trans' && <Transitar novo={c} anos={ciclos} onClose={() => setDlg(null)} />}
      {fecho !== undefined && <ResultDialog title={(fecho as Row)?._simulacao ? 'Simulação do fecho do ciclo (nada foi gravado)' : 'Ciclo fechado'} data={fecho} onClose={() => setFecho(undefined)} />}
    </>
  )
}

/* ------------ Página do ciclo ------------ */
export default function Ciclo() {
  const { id } = useParams()
  const { ciclos, isLoading } = useCiclos()
  const [sp, setSp] = useSearchParams()
  const tab = (sp.get('tab') as Tab) || 'plano'
  const c = ciclos.find((x) => String(x.id) === id)

  if (isLoading) return <Loading />
  if (!c) return <Empty>Ciclo académico não encontrado. <Link to="/ciclos">Ver os ciclos</Link></Empty>
  const estado = estadoCiclo(c)
  return (
    <>
      <PageHead
        title={`Ciclo ${nomeCiclo(c)}`}
        sub={<>{dataPT(pick(c, 'data_inicio'))} a {dataPT(pick(c, 'data_fim'))} · <Estado v={estado} text={label(estado)} /></>}
        actions={<AccoesCiclo key={c.id} c={c} ciclos={ciclos} />}
      />
      <Tabs<Tab> value={tab} onChange={(t) => setSp({ tab: t }, { replace: true })}
        tabs={[['plano', 'Plano de actividade'], ['turmas', 'Turmas'], ['horarios', 'Horários'], ['cargas', 'Cargas horárias']]} />
      {tab === 'plano' && <Plano key={c.id} c={c} />}
      {tab === 'turmas' && <Turmas key={c.id} c={c} />}
      {tab === 'horarios' && <Horarios key={c.id} c={c} />}
      {tab === 'cargas' && <Cargas key={c.id} c={c} />}
    </>
  )
}
