import { useEffect, useState } from 'react'
import { FormDialog, type FieldDef } from '@/components/FormDialog'
import { Modal } from '@/components/Modal'
import { Table } from '@/components/Table'
import { Btn, Loading, PageHead, Tabs, Tag } from '@/components/ui'
import { useAuth } from '@/auth/AuthContext'
import { funcionarioOptions } from '@/lib/academic'
import { api } from '@/lib/api'
import { useCicloActual } from '@/lib/ciclos'
import { type Row } from '@/lib/data'
import { hojeISO, label } from '@/lib/format'
import { useAct, useList } from '@/lib/hooks'

const hora = (v: unknown) => String(v ?? '').slice(0, 5)
const ESTADOS = ['presente', 'atraso', 'falta_justificada', 'falta_injustificada'].map((v) => ({ value: v, label: v === 'atraso' ? 'Atraso' : label(v) }))
const INVALIDAR = ['/aulas', '/assiduidade', '/professores', '/alertas']

function estadoDaAula(r: Row) {
  if (r.estado === 'dada') return <Tag tone="ok">Dada</Tag>
  if (r.estado === 'falta_professor') return <Tag tone="er">Falta do professor</Tag>
  return <Tag tone="wa">Por registar</Tag>
}

/** O professor regista a aula: sumário, atraso e a chamada dos alunos desse tempo. */
function RegistarAula({ aula, onClose }: { aula: Row; onClose: () => void }) {
  const alunos = useList('/alunos', { turma_id: aula.turma_id, estado: 'activo', limit: 500 })
  const existentes = useList('/assiduidade', { turma_id: aula.turma_id, desde: aula.data, ate: aula.data })
  const [sumario, setSumario] = useState(String(aula.sumario ?? ''))
  const [atraso, setAtraso] = useState('0')
  const [reg, setReg] = useState<Record<string, string>>({})
  useEffect(() => {
    const m: Record<string, string> = {}
    alunos.rows.forEach((a) => { m[a.id] = 'presente' })
    existentes.rows.filter((e) => e.horario_id === aula.horario_id).forEach((e) => { if (m[e.aluno_id]) m[e.aluno_id] = String(e.estado) })
    setReg(m)
  }, [alunos.data, existentes.data]) // eslint-disable-line react-hooks/exhaustive-deps
  const gravar = useAct(() => api.post('/aulas/registar', {
    horario_id: aula.horario_id, data: aula.data, sumario: sumario.trim() || undefined, atraso_minutos: Number(atraso) || 0,
    presencas: Object.entries(reg).map(([aluno_id, estado]) => ({ aluno_id: Number(aluno_id), estado })),
  }), { invalidate: INVALIDAR, ok: 'Aula registada.', onDone: onClose })
  const ausentes = Object.values(reg).filter((e) => e !== 'presente').length
  const todos = (estado: string) => setReg((r) => Object.fromEntries(Object.keys(r).map((k) => [k, estado])))

  return (
    <Modal title={`${aula.disciplina} · ${aula.turma} · ${hora(aula.hora_inicio)}–${hora(aula.hora_fim)}`} size="lg" onClose={onClose} footer={<>
      <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      <Btn busy={gravar.isPending} disabled={alunos.isLoading} onClick={() => gravar.mutate()}>
        Registar aula{ausentes ? ` (${ausentes} ausência${ausentes > 1 ? 's' : ''})` : ''}</Btn>
    </>}>
      <div className="aula-form">
        <label>Sumário<textarea rows={2} value={sumario} onChange={(e) => setSumario(e.target.value)} /></label>
        <label>Atraso do professor (min.)<input type="number" min={0} max={240} value={atraso} onChange={(e) => setAtraso(e.target.value)} /></label>
      </div>
      <div className="row-a" style={{ margin: '12px 0 8px' }}>
        <Btn variant="ghost" size="sm" onClick={() => todos('presente')}>Todos presentes</Btn>
        <Btn variant="ghost" size="sm" onClick={() => todos('falta_injustificada')}>Todos ausentes</Btn>
      </div>
      {alunos.isLoading ? <Loading /> : (
        <Table rows={alunos.rows} pageSize={0} empty="Esta turma não tem alunos activos." cols={[
          { h: 'Aluno', k: ['nome_completo', 'nome'] },
          { h: 'Presença', render: (a) => (
            <select aria-label={`Presença de ${a.nome_completo}`} value={reg[a.id] ?? 'presente'}
              onChange={(e) => setReg((r) => ({ ...r, [a.id]: e.target.value }))}>
              {ESTADOS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) },
        ]} />
      )}
    </Modal>
  )
}

const faltaFields: FieldDef[] = [{ name: 'motivo', label: 'Motivo', type: 'textarea', wide: true }]
const substitutoFields: FieldDef[] = [
  { name: 'substituto_id', label: 'Professor substituto', type: 'select', required: true,
    options: { ...funcionarioOptions, params: { cargo: 'professor' } } },
  { name: 'motivo', label: 'Motivo', wide: true },
]

/** Aulas previstas num dia: o professor vê as suas e regista-as; a coordenação vê todas, marca faltas e substitutos. */
export default function Aulas() {
  const { user } = useAuth()
  const perms: string[] = Array.isArray(user?.permissoes) ? user!.permissoes : []
  const gere = perms.includes('academico:editar')
  const temProfessor = !!user?.funcionario_id
  const [vista, setVista] = useState<'minhas' | 'todas'>(temProfessor ? 'minhas' : 'todas')
  const [data, setData] = useState(hojeISO())
  const [registar, setRegistar] = useState<Row | null>(null)
  const [falta, setFalta] = useState<Row | null>(null)
  const [substituir, setSubstituir] = useState<Row | null>(null)
  const minhas = vista === 'minhas'
  const q = useList('/aulas', { data, meus: minhas || undefined })
  const { ciclo } = useCicloActual()
  const fechado = String(ciclo?.estado) === 'encerrado'
  const futuro = data > hojeISO()
  const bloqueado = futuro || fechado

  const marcarFalta = useAct((p: Row) => api.post('/aulas/falta-professor', { horario_id: falta!.horario_id, data, ...p }),
    { invalidate: INVALIDAR, ok: 'Falta do professor registada.', onDone: () => setFalta(null) })
  const nomear = useAct((p: Row) => api.post('/substituicoes', { horario_id: substituir!.horario_id, data, ...p }),
    { invalidate: INVALIDAR, ok: 'Substituto nomeado.', onDone: () => setSubstituir(null) })

  const separadores: ['minhas' | 'todas', string][] = [
    ...(temProfessor ? [['minhas', 'As minhas aulas'] as ['minhas', string]] : []),
    ...(gere || !temProfessor ? [['todas', 'Todas as aulas'] as ['todas', string]] : []),
  ]

  return (
    <>
      <PageHead title="Aulas" />
      {separadores.length > 1 && <Tabs tabs={separadores} value={vista} onChange={setVista} />}
      <div className="toolbar">
        <input type="date" aria-label="Data" value={data} onChange={(e) => setData(e.target.value)} />
        <Btn variant="ghost" size="sm" disabled={data === hojeISO()} onClick={() => setData(hojeISO())}>Hoje</Btn>
      </div>
      <Table rows={q.rows} loading={q.isLoading} error={q.error} onRetry={() => q.refetch()} pageSize={0}
        rowKey={(r) => String(r.horario_id)}
        empty={minhas ? 'Não tem aulas neste dia.' : 'Não há aulas previstas neste dia.'}
        cols={[
          { h: 'Hora', nowrap: true, render: (r) => `${hora(r.hora_inicio)}–${hora(r.hora_fim)}` },
          { h: 'Turma', k: 'turma' },
          { h: 'Disciplina', k: 'disciplina' },
          ...(minhas ? [] : [{ h: 'Professor', render: (r: Row) => <>{String(r.professor ?? '—')}{r.substituicao ? <> <Tag tone="n">Substituto</Tag></> : null}</> }]),
          { h: 'Estado', render: (r) => estadoDaAula(r) },
          { h: minhas ? 'Sumário' : 'Sumário / motivo', render: (r) => String(r.sumario ?? '') },
          { h: '', render: (r) => (
            <div className="row-a">
              {(minhas || gere) && r.estado !== 'falta_professor' && (
                <Btn size="sm" variant={r.registada ? 'ghost' : 'primary'} disabled={bloqueado} onClick={() => setRegistar(r)}>
                  {r.registada ? 'Editar' : 'Registar'}</Btn>
              )}
              {!minhas && gere && !r.registada && <Btn size="sm" variant="ghost" disabled={bloqueado} onClick={() => setFalta(r)}>Marcar falta</Btn>}
              {!minhas && gere && !r.registada && <Btn size="sm" variant="ghost" disabled={fechado} onClick={() => setSubstituir(r)}>Substituto</Btn>}
            </div>
          ) },
        ]} />

      {registar && <RegistarAula aula={registar} onClose={() => setRegistar(null)} />}
      {falta && <FormDialog title={`Falta do professor: ${falta.professor ?? ''}`} fields={faltaFields} submitLabel="Marcar falta"
        intro={<span className="mu">{String(falta.disciplina)} · {String(falta.turma)} · {hora(falta.hora_inicio)}–{hora(falta.hora_fim)}</span>}
        onSubmit={(p) => marcarFalta.mutateAsync(p)} onClose={() => setFalta(null)} />}
      {substituir && <FormDialog title="Nomear substituto" fields={substitutoFields} submitLabel="Nomear"
        intro={<span className="mu">{String(substituir.disciplina)} · {String(substituir.turma)} · {hora(substituir.hora_inicio)}–{hora(substituir.hora_fim)}</span>}
        onSubmit={(p) => nomear.mutateAsync(p)} onClose={() => setSubstituir(null)} />}
    </>
  )
}
