import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { FormDialog, type FieldDef } from '@/components/FormDialog'
import { Modal, ResultDialog, useConfirm } from '@/components/Modal'
import { Resource } from '@/components/Resource'
import { Table } from '@/components/Table'
import { Btn, Card, Empty, Loading, PageHead, Select, Tabs, Tag } from '@/components/ui'
import { api, errMsg } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/Toast'
import { num, pick, type Row } from '@/lib/data'
import { classeOptions, funcionarioOptions, isActivo, planoOptions } from '@/lib/academic'
import { nomeCiclo, useCicloActual } from '@/lib/ciclos'
import { dataDoCiclo, horasTexto, useCargasDoHorario, type Carga } from '@/lib/cargas'
import { dataPT, label } from '@/lib/format'
import { useAct, useList } from '@/lib/hooks'
import { Atribuicoes, comuns } from './Turmas'

/** Nome da turma montado pela classe e pela letra, sempre no mesmo formato: «5.ª Classe» + «B» → «5.ª B». */
const LETRAS = 'ABCDEFGHIJKL'.split('').map((l) => ({ value: l, label: l }))
const prefixoDaClasse = (designacao: unknown) => String(designacao ?? '').replace(/\s*classe\b.*$/i, '').trim()
const turmaNovaFields: FieldDef[] = [
  { name: 'classe_id', label: 'Classe', type: 'select', options: classeOptions, required: true },
  { name: 'letra', label: 'Turma (letra)', type: 'select', options: LETRAS, required: true, hint: 'O nome fica, por exemplo, «5.ª B»' },
  ...comuns.filter((f) => f.name !== 'designacao'),
]
import { Periodos, Resultados, Transitar } from './Academico'
import { Plano } from './PlanoActividades'
import { CargasPorProfessor } from './CargasProfessor'

const hoje = () => new Date().toISOString().slice(0, 10)
const hora = (v: unknown) => String(v ?? '').slice(0, 5)

/* ------------ Plano de actividade: ver PlanoActividades.tsx ------------ */

/* ------------ Turmas ------------ */
function Turmas({ c }: { c: Row }) {
  const [at, setAt] = useState<Row | null>(null)
  const classes = useList('/classes')
  return (
    <>
      <Resource
        path="/turmas"
        params={{ ano_id: c.id }}
        invalidate={['/turmas']}
        search
        createLabel="Nova turma"
        createFields={turmaNovaFields}
        beforeCreate={(p) => {
          const { letra, ...resto } = p
          const classe = classes.rows.find((k) => k.id === p.classe_id)
          return { ...resto, ano_id: c.id, designacao: `${prefixoDaClasse(pick(classe, 'designacao'))} ${letra}`.trim() }
        }}
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


/** Mapa de horário da turma (como o mapa em papel): uma linha por intervalo de horas, uma coluna por dia; em cada aula
 *  a disciplina por extenso, a sala quando não é a da turma e o nome completo do professor. */
function MapaHorario({ rows, turma, salaTurma, onAula }: { rows: Row[]; turma: string; salaTurma: unknown; onAula: (r: Row) => void }) {
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
                    <button type="button" key={r.id} className="mh-aula" title="Clique para editar ou retirar do horário" onClick={() => onAula(r)}>
                      <b>{String(r.disciplina ?? '').toUpperCase()}</b>
                      {r.sala_id && r.sala_id !== salaTurma && <em>({String(r.sala ?? '')})</em>}
                      <span>{String(r.professor ?? 'Professor por atribuir')}</span>
                    </button>
                  ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Soma minutos a uma hora "HH:MM" (sem passar da meia-noite). */
function somarMinutos(h: string, min: number) {
  const [hh, mm] = h.split(':').map(Number)
  if (Number.isNaN(hh) || Number.isNaN(mm)) return ''
  const total = Math.min(hh * 60 + mm + min, 23 * 60 + 59)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function Horarios({ c }: { c: Row }) {
  const confirm = useConfirm()
  const turmas = useList('/turmas', { ano_id: c.id })
  const tempos = useList('/tempos-lectivos')
  const [turma, setTurma] = useState('')
  const [novo, setNovo] = useState(false)
  const [aula, setAula] = useState<Row | null>(null)       // aula clicada: escolher editar ou retirar
  const [editar, setEditar] = useState<Row | null>(null)
  const data = dataDoCiclo(c)
  const q = useList(turma ? '/horarios' : null, { turma_id: turma, data })
  const toast = useToast()
  const qc = useQueryClient()
  /** Cria o mesmo tempo lectivo em cada dia escolhido (ex.: Ciências da Natureza à segunda e à quarta). */
  const criarNosDias = async (p: Row) => {
    const dias: number[] = Array.isArray(p.dia_semana) ? p.dia_semana : []
    if (!dias.length) {
      toast.error('Escolha pelo menos um dia da semana.')
      throw new Error('sem dias')
    }
    const erros: string[] = []
    let criados = 0
    for (const d of dias) {
      try {
        await api.post('/horarios', { ...p, dia_semana: d, turma_id: Number(turma) })
        criados++
      } catch (e) {
        erros.push(`${DIAS.find((x) => x.value === d)?.label}: ${errMsg(e)}`)
      }
    }
    qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('/horarios') })
    if (criados) toast.ok(criados === 1 ? 'Tempo lectivo criado.' : `Tempo lectivo criado em ${criados} dias.`)
    erros.forEach((m) => toast.error(m))
    if (!criados) throw new Error('nenhum criado')   // mantém o formulário aberto para corrigir
  }
  const guardar = useAct((v: { id: number; p: Row }) => api.post(`/horarios/${v.id}/editar`, v.p), { invalidate: ['/horarios'], ok: 'Horário actualizado.' })
  const terminar = useAct((id: number) => api.post(`/horarios/${id}/terminar`), { invalidate: ['/horarios'], ok: 'Tempo lectivo retirado do horário.' })
  const futuro = data > hoje()

  // Tempo escolhido na lista (registada em Registo académico → Tempos lectivos): o fim é início + duração.
  const duracao = (tempo: unknown) => tempos.rows.find((x) => String(x.ordem) === String(tempo))?.duracao_minutos
  const derivar = (v: Row, campo: string) => {
    if (campo !== 'tempo' && campo !== 'hora_inicio') return v
    const d = duracao(v.tempo)
    return d && v.hora_inicio ? { ...v, hora_fim: somarMinutos(String(v.hora_inicio), Number(d)) } : { ...v, hora_fim: '' }
  }
  const campos: FieldDef[] = [
    { name: 'disciplina_id', label: 'Disciplina', type: 'select', required: true, hint: 'Disciplinas do plano curricular da classe',
      options: planoOptions(turmas.rows.find((x) => String(x.id) === turma)?.classe_id) },
    { name: 'funcionario_id', label: 'Professor', type: 'select', options: { ...funcionarioOptions, params: { cargo: 'professor' } } },
    { name: 'dia_semana', label: 'Dia', type: 'select', options: DIAS, required: true },
    { name: 'tempo', label: 'Tempo', type: 'select', required: true,
      options: tempos.rows.map((x) => ({ value: x.ordem, label: `${x.designacao} (${x.duracao_minutos} min)` })) },
    { name: 'hora_inicio', label: 'Início', type: 'time', required: true },
    { name: 'hora_fim', label: 'Fim', type: 'time', readOnly: true, hint: 'Calculado: início + duração do tempo' },
  ]
  // No novo tempo lectivo escolhem-se vários dias; a sala é a da turma.
  const camposNovo: FieldDef[] = [
    ...campos.map((f) => (f.name === 'dia_semana' ? { ...f, type: 'multi' as const, label: 'Dias da semana', default: [],
      hint: 'Pode escolher vários dias: cria-se uma aula em cada um' } : f)),
    { name: 'valido_desde', label: 'Em vigor desde', type: 'date', default: futuro ? data : undefined, hint: 'Em branco: hoje' }]
  const nomeTurma = String(pick(turmas.rows.find((t) => String(t.id) === turma), 'designacao') ?? '')
  const descreve = (r: Row) => `${r.disciplina} — ${DIAS.find((d) => d.value === r.dia_semana)?.label}, ${hora(r.hora_inicio)}–${hora(r.hora_fim)}`
  const semTempos = !tempos.isLoading && !tempos.rows.length

  return (
    <section>
      <div className="toolbar">
        <Select label="Turma" value={turma} onChange={setTurma} placeholder={turmas.isLoading ? 'A carregar…' : 'Escolha a turma'}
          options={turmas.rows.map((t) => ({ value: t.id, label: String(pick(t, 'designacao')) }))} />
        <span className="grow" />
        {turma && <Btn variant="ghost" disabled={!q.rows.length}
          onClick={() => api.download(`/turmas/${turma}/horario.pdf`, { data }).catch((e) => toast.error(errMsg(e)))}>
          Baixar horário (PDF)</Btn>}
        {turma && <Btn disabled={semTempos} onClick={() => setNovo(true)}>Novo tempo lectivo</Btn>}
      </div>
      {semTempos && (
        <p className="note" style={{ margin: '0 0 12px' }}>
          Para criar o horário, registe primeiro os tempos lectivos (ex.: 1.º tempo, 45 min) em{' '}
          <Link to="/academico?tab=tempos">Registo académico → Tempos lectivos</Link>.
        </p>
      )}
      {!turmas.isLoading && !turmas.rows.length ? <Empty>Crie primeiro as turmas deste ciclo.</Empty>
        : !turma ? <Empty>Escolha uma turma para ver o horário.</Empty>
          : (
            q.isLoading ? <Loading /> : !q.rows.length ? <Empty>Esta turma ainda não tem horário.</Empty> : (
              <MapaHorario rows={q.rows} turma={nomeTurma} onAula={setAula}
                salaTurma={pick(turmas.rows.find((t) => String(t.id) === turma), 'sala_id')} />
            )
          )}
      {novo && <FormDialog title="Novo tempo lectivo" fields={camposNovo} derivar={derivar} onClose={() => setNovo(false)} onSubmit={criarNosDias}
        intro={<span className="mu">A aula fica na sala da turma.</span>} />}
      {aula && (
        <Modal title="Aula no horário" size="sm" onClose={() => setAula(null)} footer={<>
          <Btn variant="ghost" onClick={async () => {
            const r = aula
            setAula(null)
            if (await confirm({ title: 'Retirar do horário', text: `Retirar ${descreve(r)} do horário? Fica no histórico.`, yes: 'Retirar' })) terminar.mutate(r.id)
          }}>Retirar</Btn>
          <Btn onClick={() => { setEditar(aula); setAula(null) }}>Editar</Btn>
        </>}>
          <p style={{ margin: 0 }}><b>{descreve(aula)}</b><br />{aula.professor ?? 'Sem professor'} · {nomeTurma}</p>
        </Modal>
      )}
      {editar && (
        <FormDialog title={`Editar — ${descreve(editar)}`} fields={campos} derivar={derivar}
          initial={{ ...editar, hora_inicio: hora(editar.hora_inicio), hora_fim: hora(editar.hora_fim) }}
          intro={<span className="mu">Se esta aula já está em uso, a alteração vale a partir de hoje e a versão anterior fica no histórico (faltas e sumários não mudam).</span>}
          onClose={() => setEditar(null)} onSubmit={(p) => guardar.mutateAsync({ id: editar.id, p })} />
      )}
    </section>
  )
}

/* ------------ Cargas horárias (calculadas do horário) ------------ */
/** Uma turma: para cada disciplina do plano curricular da classe e do horário, os tempos e as horas por semana. */
function CargasTurma({ turma, cargas, nomes }: { turma: Row; cargas?: Map<unknown, Carga>; nomes: Map<unknown, string> }) {
  const plano = useList(`/classes/${turma.classe_id}/disciplinas`)
  const ids = [...new Set([...plano.rows.map((d) => d.id), ...(cargas?.keys() ?? [])])]
  const linhas = ids.map((id) => {
    const c = cargas?.get(id)
    const d = plano.rows.find((x) => x.id === id)
    return { id, disciplina: String(pick(d, 'nome') ?? nomes.get(id) ?? '—'), sigla: pick(d, 'sigla'), tempos: c?.tempos ?? 0,
      minutos: c?.minutos ?? 0, professores: c ? [...c.professores].join(', ') : '', noPlano: !!d }
  }).sort((a, b) => b.tempos - a.tempos || a.disciplina.localeCompare(b.disciplina))
  const tTotal = linhas.reduce((s, l) => s + l.tempos, 0), mTotal = linhas.reduce((s, l) => s + l.minutos, 0)
  return (
    <Card title={`${pick(turma, 'designacao')} · ${pick(turma, 'classe') ?? ''}${tTotal ? ` · ${tTotal} tempos (${horasTexto(mTotal)}) por semana` : ''}`}>
      {plano.isLoading ? <Loading /> : (
        <Table rows={linhas} pageSize={0} empty="Sem disciplinas no plano nem no horário." cols={[
          { h: 'Disciplina', render: (r) => <>{r.disciplina}{r.sigla ? <span className="mu"> ({r.sigla})</span> : null}</> },
          { h: 'Tempos / semana', render: (r) => (r.tempos ? r.tempos : <Tag tone="wa">Sem tempos no horário</Tag>) },
          { h: 'Horas / semana', render: (r) => (r.minutos ? horasTexto(r.minutos) : '—') },
          { h: 'Professor', render: (r) => r.professores || '—' },
          { h: '', render: (r) => (!r.noPlano ? <Tag tone="n">Fora do plano curricular</Tag> : null) },
        ]} />
      )}
    </Card>
  )
}

function Cargas({ c }: { c: Row }) {
  const [vista, setVista] = useState<'professor' | 'turma'>('professor')
  return (
    <>
      <Tabs<'professor' | 'turma'> tabs={[['professor', 'Por professor'], ['turma', 'Por turma']]} value={vista} onChange={setVista} />
      {vista === 'professor' ? <CargasPorProfessor c={c} /> : <CargasPorTurma c={c} />}
    </>
  )
}

function CargasPorTurma({ c }: { c: Row }) {
  const { turmas, porTurma, nomeDisciplina, isLoading } = useCargasDoHorario()
  if (isLoading) return <Loading />
  return (
    <>
      {turmas.length ? <div style={{ display: 'grid', gap: 16 }}>
        {turmas.map((t) => <CargasTurma key={t.id} turma={t} cargas={porTurma.get(t.id)} nomes={nomeDisciplina} />)}
      </div>
        : <Empty>Este ciclo ainda não tem turmas. As cargas horárias aparecem depois de criar as turmas e os horários.</Empty>}
    </>
  )
}

/* ------------ Gestão do ciclo (antes em "Anos lectivos") ------------ */
export function AccoesCiclo({ c, ciclos }: { c: Row; ciclos: Row[] }) {
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
        {!isActivo(c) && String(c.estado) !== 'encerrado' && <Btn variant="ghost" size="sm" busy={activar.isPending} onClick={() => activar.mutate()}
          title="Só depois de fechar o ciclo activo">Activar</Btn>}
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

/* ------------ Páginas do ciclo escolhido no topo ------------ */
const PAGINAS: Record<string, { titulo: string; sub: string; C: (p: { c: Row }) => ReactNode }> = {
  '/plano-actividades': { titulo: 'Plano de actividade', sub: 'Calendário do ano lectivo.', C: Plano },
  '/turmas': { titulo: 'Turmas', sub: 'Turmas do ciclo, ocupação e professores por disciplina.', C: Turmas },
  '/horarios': { titulo: 'Horários', sub: 'Mapa de horário de cada turma do ciclo.', C: Horarios },
  '/cargas-horarias': { titulo: 'Cargas horárias', sub: 'Carga horária semanal por professor e por turma.', C: Cargas },
}

export default function CicloPagina() {
  const { pathname } = useLocation()
  const { ciclo, isLoading } = useCicloActual()
  const p = PAGINAS[pathname] ?? PAGINAS['/plano-actividades']
  if (isLoading) return <Loading />
  if (!ciclo) return <Empty>Ainda não há ciclos académicos. <Link to="/ciclos">Crie o primeiro ciclo</Link>.</Empty>
  return (
    <>
      <PageHead title={p.titulo} sub={<>{p.sub} Ciclo <b>{nomeCiclo(ciclo)}</b> ({dataPT(pick(ciclo, 'data_inicio'))} a {dataPT(pick(ciclo, 'data_fim'))}).</>} />
      <p.C key={ciclo.id} c={ciclo} />
    </>
  )
}
