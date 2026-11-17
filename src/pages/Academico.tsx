import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router'
import { FormDialog, type FieldDef } from '@/components/FormDialog'
import { Modal, ResultDialog } from '@/components/Modal'
import { Resource } from '@/components/Resource'
import { Table } from '@/components/Table'
import { Btn, Empty, Estado, Loading, PageHead, Select, Tabs, Tag } from '@/components/ui'
import { api } from '@/lib/api'
import { num, perfisOf, pick, type Row } from '@/lib/data'
import { TIPOS_SALA, disciplinaOptions } from '@/lib/academic'
import { dataPT, label } from '@/lib/format'
import { useAct, useList } from '@/lib/hooks'

type Tab = 'niveis' | 'classes' | 'disciplinas' | 'programas' | 'salas' | 'tempos' | 'professores' | 'funcionarios'

/* ------------ Ordem (posição na lista) ------------
   Ao criar é automática (a seguinte). Ao editar pode mudar-se: se outro registo já tiver essa ordem, os dois trocam. */
const campoOrdem: FieldDef = { name: 'ordem', label: 'Ordem', type: 'number', min: 1, required: true,
  hint: 'Posição na lista. Se outro registo já tiver esta ordem, os dois trocam de posição.' }
const semOrdem = (fs: FieldDef[]) => fs.filter((f) => f.name !== 'ordem')

/** Ordens que aparecem mais de uma vez (dados antigos): mostram-se a vermelho para corrigir. */
function repetidas(rows: Row[], grupo: (r: Row) => unknown = () => '') {
  const vistas = new Map<string, number>()
  for (const r of rows) { const k = `${grupo(r)}|${r.ordem}`; vistas.set(k, (vistas.get(k) ?? 0) + 1) }
  return (r: Row) => (vistas.get(`${grupo(r)}|${r.ordem}`) ?? 0) > 1
}
const celOrdem = (rep: (r: Row) => boolean) => (r: Row) =>
  rep(r) ? <span title="Há outro registo com a mesma ordem: edite um deles para a corrigir.">{r.ordem} <Tag tone="er">Repetida</Tag></span> : r.ordem

/* ------------ Ano lectivo ------------ */
const periodoFields: FieldDef[] = [
  { name: 'designacao', label: 'Designação', required: true, placeholder: '1.º trimestre', wide: true },
  { name: 'ordem', label: 'Ordem', type: 'number', required: true },
  { name: 'data_inicio', label: 'Início', type: 'date', required: true },
  { name: 'data_fim', label: 'Fim', type: 'date', required: true },
]

export function Periodos({ ano, onClose }: { ano: Row; onClose: () => void }) {
  const q = useList(`/anos-lectivos/${ano.id}/periodos`)
  const [novo, setNovo] = useState(false)
  const criar = useAct((p: Row) => api.post(`/anos-lectivos/${ano.id}/periodos`, p), { invalidate: [`/anos-lectivos/${ano.id}`], ok: 'Período criado.' })
  return (
    <Modal title={`Períodos de avaliação — ${pick(ano, 'designacao')}`} size="lg" onClose={onClose} footer={<><Btn variant="ghost" onClick={() => setNovo(true)}>Novo período</Btn><Btn onClick={onClose}>Fechar</Btn></>}>
      <Resource path={`/anos-lectivos/${ano.id}/periodos`} pageSize={0}
        editFields={periodoFields} editPath={(r) => `/periodos/${r.id}`} deletePath={(r) => `/periodos/${r.id}`}
        cols={[
          { h: 'Ordem', k: 'ordem' }, { h: 'Período', k: ['designacao', 'nome'] },
          { h: 'Início', render: (r) => dataPT(pick(r, 'data_inicio')) }, { h: 'Fim', render: (r) => dataPT(pick(r, 'data_fim')) },
        ]} />
      {novo && (
        <FormDialog title="Novo período" size="sm" onClose={() => setNovo(false)} onSubmit={(p) => criar.mutateAsync(p)}
          fields={periodoFields.map((f) => (f.name === 'ordem' ? { ...f, default: (q.rows.length || 0) + 1 } : f))} />
      )}
    </Modal>
  )
}

export function Resultados({ ano, onClose }: { ano: Row; onClose: () => void }) {
  const q = useList(`/anos-lectivos/${ano.id}/resultados`)
  return (
    <Modal title={`Resultados finais — ${pick(ano, 'designacao')}`} size="xl" onClose={onClose}>
      {q.isLoading ? <Loading /> : <Table rows={q.rows} error={q.error} empty="Ainda não há resultados gravados. Feche o ano para os calcular." />}
    </Modal>
  )
}

export function Transitar({ novo, anos, onClose }: { novo: Row; anos: Row[]; onClose: () => void }) {
  const [de, setDe] = useState('')
  const [copiar, setCopiar] = useState(true)
  const [map, setMap] = useState<Record<string, string>>({})
  const [rep, setRep] = useState<Record<string, string>>({})
  const [res, setRes] = useState<unknown>()
  const antigas = useList(de ? '/turmas' : null, { ano_id: de })
  const novas = useList('/turmas', { ano_id: novo.id })
  const opts = novas.rows.map((t) => ({ value: t.id, label: String(pick(t, 'designacao')) }))
  const run = useAct((p: Row) => api.post(`/anos-lectivos/${novo.id}/transitar`, p), { invalidate: ['/matriculas', '/alunos', '/turmas'], ok: 'Transição concluída.', onDone: setRes })
  const pares = (m: Record<string, string>) => Object.entries(m).filter(([, v]) => v).map(([k, v]) => ({ de: Number(k), para: Number(v) }))

  if (res !== undefined) return <ResultDialog title="Resultado da transição" data={res} onClose={onClose} />
  return (
    <Modal
      title={`Transitar alunos para ${pick(novo, 'designacao')}`}
      size="lg"
      onClose={onClose}
      footer={<><Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn busy={run.isPending} disabled={!de || !pares(map).length} onClick={() => run.mutate({ de_ano_id: Number(de), turmas: pares(map), repetentes: pares(rep), copiar_servicos: copiar })}>Transitar</Btn></>}
    >
      <p className="sub" style={{ marginTop: 0 }}>Escolha o ano de origem e, para cada turma, a turma de destino. Os repetentes ficam na turma indicada na segunda coluna.</p>
      <div className="toolbar">
        <Select label="Ano de origem" value={de} onChange={setDe} placeholder="Ano de origem" options={anos.filter((a) => a.id !== novo.id).map((a) => ({ value: a.id, label: String(pick(a, 'designacao')) }))} />
        <label className="inline-chk"><input type="checkbox" checked={copiar} onChange={(e) => setCopiar(e.target.checked)} /> <span>Copiar serviços (propina, refeitório…)</span></label>
      </div>
      {de && (antigas.isLoading ? <Loading /> : (
        <Table rows={antigas.rows} pageSize={0} empty="O ano de origem não tem turmas." cols={[
          { h: 'Turma de origem', k: 'designacao' },
          { h: 'Passa para', render: (r) => <Select label="Destino" value={map[r.id]} onChange={(v) => setMap((m) => ({ ...m, [r.id]: v }))} placeholder="— Não transitar —" options={opts} /> },
          { h: 'Repetentes ficam em', render: (r) => <Select label="Repetentes" value={rep[r.id]} onChange={(v) => setRep((m) => ({ ...m, [r.id]: v }))} placeholder="— Ninguém —" options={opts} /> },
        ]} />
      ))}
    </Modal>
  )
}

/* ------------ Programas das disciplinas ------------ */
const TRIMESTRES = [{ value: 1, label: '1.º trimestre' }, { value: 2, label: '2.º trimestre' }, { value: 3, label: '3.º trimestre' }]
const unidadeFields: FieldDef[] = [
  { name: 'titulo', label: 'Unidade temática', required: true, wide: true, placeholder: 'Ex.: Números naturais' },
  campoOrdem,
  { name: 'trimestre', label: 'Trimestre', type: 'select', options: TRIMESTRES },
  { name: 'tempo_lectivo_id', label: 'Tempo', type: 'select', hint: 'Tempos registados em «Tempos lectivos»',
    options: { path: '/tempos-lectivos', text: (r: Row) => `${r.designacao} (${r.duracao_minutos} min)` } },
  { name: 'objectivos', label: 'Objectivos', type: 'textarea', wide: true },
  { name: 'conteudos', label: 'Conteúdos', type: 'textarea', wide: true },
]

function Programas() {
  const [classe, setClasse] = useState('')
  const [disciplina, setDisciplina] = useState('')
  const classes = useList('/classes')
  const plano = useList(classe ? `/classes/${classe}/disciplinas` : null)
  const todas = useList('/disciplinas')
  // Disciplinas do plano curricular da classe; sem plano, todas as disciplinas da escola.
  const discs = plano.rows.length ? plano.rows : todas.rows
  const params = { classe_id: classe, disciplina_id: disciplina }
  const q = useList(classe && disciplina ? '/programas' : null, params)
  const tempos = useList('/tempos-lectivos')
  const nomeTempo = (id: unknown) => {
    const x = tempos.rows.find((t) => t.id === id)
    return x ? `${x.designacao} (${x.duracao_minutos} min)` : '—'
  }
  const carga = plano.rows.find((d) => String(d.id) === disciplina)?.carga_horaria

  return (
    <>
      <div className="toolbar">
        <Select label="Classe" value={classe} onChange={(v) => { setClasse(v); setDisciplina('') }} placeholder="Escolha a classe"
          options={classes.rows.map((c) => ({ value: c.id, label: String(pick(c, 'designacao', 'nome')) }))} />
        <Select label="Disciplina" value={disciplina} onChange={setDisciplina} placeholder={classe ? 'Escolha a disciplina' : 'Escolha primeiro a classe'}
          options={classe ? discs.map((d) => ({ value: d.id, label: String(pick(d, 'nome', 'designacao')) })) : []} />
      </div>
      {!(classe && disciplina) ? <Empty>Escolha a classe e a disciplina para ver e criar o programa.</Empty> : (
        <Resource
          path="/programas"
          params={params}
          invalidate={['/programas']}
          crud="/programas"
          createLabel="Nova unidade"
          createFields={semOrdem(unidadeFields)}
          editFields={unidadeFields}
          beforeCreate={(p) => ({ ...p, classe_id: Number(classe), disciplina_id: Number(disciplina) })}
          deleteName={(r) => String(r.titulo)}
          pageSize={0}
          hint={<>{q.rows.length} unidade(s){carga ? ` · carga horária da disciplina: ${carga} tempos por semana` : ''}. Em «⋯ → Visualizar» vê os objectivos e conteúdos.</>}
          empty="Esta disciplina ainda não tem programa nesta classe."
          expand={(r) => (
            <div style={{ display: 'grid', gap: 8, whiteSpace: 'pre-wrap' }}>
              <div><b>Objectivos</b><br />{r.objectivos || '—'}</div>
              <div><b>Conteúdos</b><br />{r.conteudos || '—'}</div>
            </div>
          )}
          cols={[
            { h: 'N.º', render: celOrdem(repetidas(q.rows)) },
            { h: 'Unidade temática', k: 'titulo' },
            { h: 'Trimestre', render: (r) => (r.trimestre ? `${r.trimestre}.º` : '—') },
            { h: 'Tempo', render: (r) => nomeTempo(r.tempo_lectivo_id) },
          ]}
        />
      )}
    </>
  )
}

/* ------------ Classes ------------ */
function Plano({ c, onClose }: { c: Row; onClose: () => void }) {
  const q = useList(`/classes/${c.id}/disciplinas`)
  const [novo, setNovo] = useState(false)
  const assoc = useAct((p: Row) => api.post(`/classes/${c.id}/disciplinas`, p), { invalidate: [`/classes/${c.id}`], ok: 'Disciplina associada.' })
  return (
    <Modal title={`Plano curricular — ${pick(c, 'designacao')}`} size="lg" onClose={onClose} footer={<><Btn variant="ghost" onClick={() => setNovo(true)}>Associar disciplina</Btn><Btn onClick={onClose}>Fechar</Btn></>}>
      {q.isLoading ? <Loading /> : <Table rows={q.rows} pageSize={0} empty="Sem disciplinas no plano." cols={[{ h: 'Disciplina', k: ['disciplina', 'disciplina.nome', 'nome'] }, { h: 'Sigla', k: ['sigla', 'disciplina.sigla'] }, { h: 'Carga horária', k: 'carga_horaria' }]} />}
      {novo && <FormDialog title="Associar disciplina" size="sm" onClose={() => setNovo(false)} onSubmit={(p) => assoc.mutateAsync(p)} fields={[
        { name: 'disciplina_id', label: 'Disciplina', type: 'select', options: disciplinaOptions, required: true, wide: true },
        { name: 'carga_horaria', label: 'Carga horária semanal', type: 'number' },
      ]} />}
    </Modal>
  )
}

const funcionarioFields: FieldDef[] = [
  { name: 'nome_completo', label: 'Nome completo', required: true, wide: true },
  { name: 'cargo', label: 'Cargo', type: 'select', required: true, default: 'professor', options: ['professor', 'coordenador', 'director', 'secretaria', 'financeiro', 'outro'].map((v) => ({ value: v, label: label(v) })) },
  { name: 'nif', label: 'NIF' },
  { name: 'telefone', label: 'Telefone', type: 'tel' },
  { name: 'email', label: 'E-mail', type: 'email' },
  { name: 'ano_contratacao', label: 'Ano de contratação', type: 'number', min: 1950, max: 2100, placeholder: 'Ex.: 2021' },
]

const salaFields: FieldDef[] = [
  { name: 'designacao', label: 'Designação', required: true, placeholder: 'Ex.: Laboratório de Ciências' },
  { name: 'tipo', label: 'Tipo de sala', type: 'select', options: TIPOS_SALA, default: 'sala_aula', required: true },
  { name: 'piso', label: 'Piso / andar', placeholder: 'Ex.: R/C, 1.º andar' },
  { name: 'localizacao', label: 'Localização', placeholder: 'Ex.: Bloco B, ao lado da biblioteca' },
  { name: 'capacidade', label: 'Capacidade (lugares)', type: 'number', min: 1 },
  { name: 'observacoes', label: 'Observações', type: 'textarea' },
]
/** Nome do coordenador do nível (a lista de utilizadores fica em cache). */
function Coordenador({ id }: { id?: number | null }) {
  const q = useList(id ? '/utilizadores' : null)
  if (!id) return <span className="mu">Toda a coordenação</span>
  return <>{q.rows.find((u) => u.id === id)?.nome ?? '—'}</>
}

const nivelFields: FieldDef[] = [
  { name: 'nome', label: 'Nome', required: true, placeholder: 'Ensino Primário' }, campoOrdem,
  { name: 'coordenador_id', label: 'Coordenador do nível', type: 'select', wide: true, empty: 'Toda a coordenação',
    hint: 'Recebe as candidaturas das classes deste nível.',
    options: { path: '/utilizadores', label: ['nome'], filter: (u: Row) => !perfisOf(u).includes('encarregado') } },
]
const classeFields: FieldDef[] = [
  { name: 'nivel_id', label: 'Nível', type: 'select', options: { path: '/niveis', label: ['nome'] }, required: true },
  { name: 'designacao', label: 'Designação', required: true, placeholder: '7.ª Classe' },
  campoOrdem,
]
const tempoFields: FieldDef[] = [
  { name: 'designacao', label: 'Nome', placeholder: 'Em branco: «1.º tempo», «2.º tempo»…' },
  { name: 'duracao_minutos', label: 'Duração (minutos)', type: 'number', min: 5, max: 240, default: 45, required: true },
  campoOrdem,
]
const disciplinaFields: FieldDef[] = [{ name: 'nome', label: 'Nome', required: true }, { name: 'sigla', label: 'Sigla' }]

export default function Academico() {
  const [sp, setSp] = useSearchParams()
  const pedido = sp.get('tab')
  // Endereços antigos: os anos lectivos passaram para Ciclos académicos.
  const tab: Tab = pedido === 'anos' || !pedido ? 'niveis' : (pedido as Tab)
  const setTab = (t: Tab) => setSp({ tab: t }, { replace: true })
  const [plano, setPlano] = useState<Row | null>(null)
  const niveisQ = useList(tab === 'niveis' ? '/niveis' : null)
  const classesQ = useList(tab === 'classes' ? '/classes' : null)
  const temposQ = useList(tab === 'tempos' ? '/tempos-lectivos' : null)
  if (pedido === 'anos') return <Navigate to="/ciclos" replace />
  return (
    <>
      <PageHead title="Registo académico" sub="Pela ordem em que se preenche: níveis de ensino, classes, disciplinas, programas, salas, tempos lectivos e professores." />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[['niveis', 'Níveis de ensino'], ['classes', 'Classes'], ['disciplinas', 'Disciplinas'], ['programas', 'Programas das disciplinas'], ['salas', 'Salas'], ['tempos', 'Tempos lectivos'], ['professores', 'Professores'], ['funcionarios', 'Outros funcionários']]} />

      {tab === 'programas' && <Programas />}
      {tab === 'professores' && (
        <Resource path="/funcionarios" params={{ cargo: 'professor' }} invalidate={['/funcionarios']} search createLabel="Novo professor"
          createFields={funcionarioFields.map((f) => (f.name === 'cargo' ? { ...f, default: 'professor' } : f))}
          editFields={[...funcionarioFields, { name: 'activo', label: 'Estado', type: 'checkbox', hint: 'Professor activo', default: true }]}
          editPath={(r) => `/funcionarios/${r.id}`} deletePath={(r) => `/funcionarios/${r.id}`}
          empty="Ainda não há professores registados."
          cols={[{ h: 'Nome', k: ['nome_completo', 'nome'] }, { h: 'Contratado em', k: 'ano_contratacao' }, { h: 'Telefone', k: 'telefone' }, { h: 'E-mail', k: 'email' }, { h: 'Estado', render: (r) => <Estado v={pick(r, 'activo') === false ? 'inactivo' : 'activo'} /> }]} />
      )}
      {tab === 'niveis' && (
        <Resource path="/niveis" createLabel="Novo nível" createFields={semOrdem(nivelFields)} editFields={nivelFields}
          editPath={(r) => `/niveis/${r.id}`} deletePath={(r) => `/niveis/${r.id}`}
          cols={[{ h: 'Ordem', render: celOrdem(repetidas(niveisQ.rows)) }, { h: 'Nível', k: ['nome', 'designacao'] }, { h: 'Coordenador', render: (r) => <Coordenador id={r.coordenador_id} /> }]} />
      )}
      {tab === 'classes' && (
        <>
          <Resource path="/classes" createLabel="Nova classe" pageSize={30}
            createFields={semOrdem(classeFields)} editFields={classeFields}
            editPath={(r) => `/classes/${r.id}`} deletePath={(r) => `/classes/${r.id}`}
            cols={[{ h: 'Ordem', render: celOrdem(repetidas(classesQ.rows)) }, { h: 'Classe', k: ['designacao', 'nome'] }, { h: 'Nível', k: ['nivel', 'nivel_nome', 'nivel.nome'] }]}
            rowActions={(r) => <Btn variant="link" onClick={() => setPlano(r)}>Plano curricular</Btn>} />
          {plano && <Plano c={plano} onClose={() => setPlano(null)} />}
        </>
      )}
      {tab === 'disciplinas' && (
        <Resource path="/disciplinas" search createLabel="Nova disciplina" createFields={disciplinaFields} editFields={disciplinaFields}
          editPath={(r) => `/disciplinas/${r.id}`} deletePath={(r) => `/disciplinas/${r.id}`}
          cols={[{ h: 'Disciplina', k: ['nome', 'designacao'] }, { h: 'Sigla', k: 'sigla' }]} />
      )}
      {tab === 'tempos' && (
        <Resource path="/tempos-lectivos" createLabel="Novo tempo lectivo" createFields={semOrdem(tempoFields)} editFields={tempoFields}
          editPath={(r) => `/tempos-lectivos/${r.id}`} deletePath={(r) => `/tempos-lectivos/${r.id}`}
          hint="Os tempos do dia e a duração de cada um. No horário escolhe-se o tempo e a hora de fim é calculada (início + duração)."
          empty="Ainda não há tempos lectivos. Crie o 1.º tempo (por omissão, 45 minutos)."
          cols={[{ h: 'Ordem', render: celOrdem(repetidas(temposQ.rows)) }, { h: 'Tempo', k: 'designacao' },
            { h: 'Duração', render: (r) => `${r.duracao_minutos} min` }]} />
      )}
      {tab === 'salas' && (
        <Resource path="/salas" search createLabel="Nova sala" createFields={salaFields}
          editFields={[...salaFields, { name: 'activo', label: 'Estado', type: 'checkbox', hint: 'Sala em uso', default: true }]}
          editPath={(r) => `/salas/${r.id}`} deletePath={(r) => `/salas/${r.id}`}
          cols={[
            { h: 'Sala', k: ['designacao', 'nome'] },
            { h: 'Tipo', render: (r) => TIPOS_SALA.find((t) => t.value === r.tipo)?.label ?? '—' },
            { h: 'Piso', k: 'piso' }, { h: 'Localização', k: 'localizacao' }, { h: 'Capacidade', k: 'capacidade' },
            { h: 'Estado', render: (r) => <Estado v={r.activo === false ? 'inactivo' : 'activo'} /> },
          ]} />
      )}
      {tab === 'funcionarios' && (
        <Resource path="/funcionarios" filter={(r) => r.cargo !== 'professor'} search createLabel="Novo funcionário"
          createFields={funcionarioFields.map((f) => (f.name === 'cargo' ? { ...f, default: 'secretaria' } : f))}
          editFields={[...funcionarioFields, { name: 'activo', label: 'Estado', type: 'checkbox', hint: 'Funcionário activo', default: true }]} editPath={(r) => `/funcionarios/${r.id}`}
          deletePath={(r) => `/funcionarios/${r.id}`}
          cols={[{ h: 'Nome', k: ['nome_completo', 'nome'] }, { h: 'Cargo', render: (r) => label(pick(r, 'cargo')) }, { h: 'Contratado em', k: 'ano_contratacao' }, { h: 'Telefone', k: 'telefone' }, { h: 'E-mail', k: 'email' }, { h: 'Estado', render: (r) => <Estado v={pick(r, 'activo') === false ? 'inactivo' : 'activo'} /> }]} />
      )}
    </>
  )
}
