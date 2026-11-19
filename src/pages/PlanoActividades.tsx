import { Fragment, useMemo, useState } from 'react'
import { FormDialog, type FieldDef } from '@/components/FormDialog'
import { Modal } from '@/components/Modal'
import { Resource } from '@/components/Resource'
import { Btn, Card, Empty, ErrorBox, Kpi, Loading, Select, Tabs, Tag } from '@/components/ui'
import { api } from '@/lib/api'
import { nomeCiclo } from '@/lib/ciclos'
import { pick, type Row } from '@/lib/data'
import { dataPT } from '@/lib/format'
import { useAct, useGet, useList } from '@/lib/hooks'

/** Tipos de actividade pelas fases do ano lectivo (como no calendário do ano académico), com a cor da legenda.
 *  Pausa, férias, interrupção e feriado são dias sem aulas: não contam como dias lectivos nem têm aulas previstas. */
export const TIPOS_ACTIVIDADE = [
  { value: 'matricula', label: 'Matrículas e inscrições', cor: '#5b8def' },
  { value: 'abertura', label: 'Abertura do ano lectivo', cor: '#f59e0b' },
  { value: 'aulas', label: 'Aulas e avaliação contínua', cor: '#94a3b8' },
  { value: 'prova', label: 'Provas (sem interromper as aulas)', cor: '#8b5cf6' },
  { value: 'exame', label: 'Exames (época normal)', cor: '#ef4444' },
  { value: 'recurso', label: 'Exames de recurso', cor: '#ec4899' },
  { value: 'entrega', label: 'Entrega de boletins e certificados', cor: '#22c55e' },
  { value: 'reuniao', label: 'Reunião', cor: '#0ea5e9' },
  { value: 'evento', label: 'Actividade / evento', cor: '#14b8a6' },
  { value: 'pausa', label: 'Pausa entre trimestres (sem aulas)', cor: '#0e7490' },
  { value: 'ferias', label: 'Férias (sem aulas)', cor: '#64748b' },
  { value: 'interrupcao', label: 'Interrupção lectiva (sem aulas)', cor: '#a16207' },
  { value: 'feriado', label: 'Feriado (sem aulas)', cor: '#dc2626' },
]
const SEM_AULAS = new Set(['pausa', 'ferias', 'interrupcao', 'feriado'])
const tipoDe = (t: unknown) => TIPOS_ACTIVIDADE.find((x) => x.value === t) ?? TIPOS_ACTIVIDADE[8]

export const actividadeFields: FieldDef[] = [
  { name: 'titulo', label: 'Actividade', required: true, wide: true, placeholder: 'Ex.: Provas do professor do 1.º trimestre' },
  { name: 'tipo', label: 'Tipo / fase', type: 'select', options: TIPOS_ACTIVIDADE, default: 'evento', required: true },
  { name: 'responsavel', label: 'Responsável', placeholder: 'Ex.: Direcção pedagógica' },
  { name: 'data_inicio', label: 'Início', type: 'date', required: true },
  { name: 'data_fim', label: 'Fim', type: 'date', hint: 'Em branco: um só dia' },
  { name: 'descricao', label: 'Descrição', type: 'textarea', wide: true },
  { name: 'publico', label: 'Portal das famílias', type: 'checkbox', hint: 'Mostrar às famílias', default: true },
]

const INVALIDAR = ['/eventos', '/anos-lectivos', '/portal']

function Chip({ a, onClick }: { a: Row; onClick?: () => void }) {
  const t = tipoDe(a.tipo)
  return (
    <button type="button" className="plano-chip" style={{ ['--cor' as string]: t.cor }} onClick={onClick} title={`${t.label} — clique para editar`}>
      {String(a.titulo)}
    </button>
  )
}

function Legenda() {
  return (
    <div className="plano-legenda">
      {TIPOS_ACTIVIDADE.map((t) => <span key={t.value} style={{ ['--cor' as string]: t.cor }}>{t.label}</span>)}
    </div>
  )
}

/** Calendário semanal: fase, n.º da semana lectiva, datas, dias com aulas e actividades (como no calendário do ano académico). */
function Semanas({ cal, editar }: { cal: Row; editar: (a: Row) => void }) {
  const semanas = (cal.semanas as Row[]) ?? []
  const hoje = new Date().toLocaleDateString('sv-SE')
  return (
    <div className="tw"><div className="tw-s">
      <table className="plano-semanas">
        <thead><tr><th>Semana</th><th>De</th><th>A</th><th className="c">Dias com aulas</th><th>Actividades</th></tr></thead>
        <tbody>
          {semanas.map((s, i) => {
            const nova = i === 0 || semanas[i - 1].fase !== s.fase
            const actual = String(s.inicio) <= hoje && hoje <= String(s.fim)
            return (
              <Fragment key={String(s.inicio)}>
                {nova && <tr className="plano-fase"><td colSpan={5}>{String(s.fase)}</td></tr>}
                <tr className={`${s.lectiva ? '' : 'sem-aulas'} ${actual ? 'actual' : ''}`}>
                  <td>{s.numero ? `${s.numero}.ª` : '—'}</td>
                  <td>{dataPT(s.inicio)}</td>
                  <td>{dataPT(s.fim)}</td>
                  <td className="c">{s.lectiva ? String(s.dias_lectivos) : <Tag>Sem aulas</Tag>}</td>
                  <td><div className="plano-chips">{((s.actividades as Row[]) ?? []).map((a) => <Chip key={String(a.id)} a={a} onClick={() => editar(a)} />)}</div></td>
                </tr>
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div></div>
  )
}

const iso = (d: Date) => d.toLocaleDateString('sv-SE')
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

/** Calendário mensal com as cores da legenda (segunda a domingo). */
function Mes({ c, eventos, periodos, editar }: { c: Row; eventos: Row[]; periodos: Row[]; editar: (a: Row) => void }) {
  const meses = useMemo(() => {
    const lista: string[] = []
    const d = new Date(`${String(pick(c, 'data_inicio')).slice(0, 7)}-01T12:00:00`)
    const fim = String(pick(c, 'data_fim')).slice(0, 7)
    while (iso(d).slice(0, 7) <= fim && lista.length < 36) { lista.push(iso(d).slice(0, 7)); d.setMonth(d.getMonth() + 1) }
    return lista
  }, [c])
  const hoje = iso(new Date()).slice(0, 7)
  const [mes, setMes] = useState(meses.includes(hoje) ? hoje : meses[0])
  const i = meses.indexOf(mes)
  const [ano, m] = mes.split('-').map(Number)
  const primeiro = new Date(ano, m - 1, 1, 12)
  const inicio = new Date(primeiro); inicio.setDate(1 - ((primeiro.getDay() + 6) % 7))
  const dias = Array.from({ length: 42 }, (_, k) => { const d = new Date(inicio); d.setDate(inicio.getDate() + k); return d })
  const linhas = dias[35].getMonth() === m - 1 ? 6 : dias[28].getMonth() === m - 1 ? 5 : 4
  const doDia = (d: string) => eventos.filter((e) => String(e.data_inicio) <= d && d <= String(e.data_fim || e.data_inicio))
  const lectivo = (d: string) => periodos.some((p) => String(p.data_inicio) <= d && d <= String(p.data_fim))
  return (
    <Card title={`${MESES[m - 1]} de ${ano}`} actions={<div className="row-a">
      <Btn variant="ghost" size="sm" disabled={i <= 0} onClick={() => setMes(meses[i - 1])}>‹ Anterior</Btn>
      <Select label="Mês" value={mes} onChange={setMes} options={meses.map((x) => ({ value: x, label: `${MESES[Number(x.slice(5)) - 1]} ${x.slice(0, 4)}` }))} />
      <Btn variant="ghost" size="sm" disabled={i >= meses.length - 1} onClick={() => setMes(meses[i + 1])}>Seguinte ›</Btn>
    </div>}>
      <div className="plano-mes">
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => <div key={d} className="plano-mes-cab">{d}</div>)}
        {dias.slice(0, linhas * 7).map((d) => {
          const k = iso(d)
          const evs = doDia(k)
          const fds = d.getDay() === 0 || d.getDay() === 6
          const semAulas = evs.some((e) => SEM_AULAS.has(String(e.tipo)))
          const cls = ['plano-dia', d.getMonth() !== m - 1 && 'fora', fds && 'fds', !fds && lectivo(k) && !semAulas && 'lectivo', semAulas && 'sem-aulas']
          return (
            <div key={k} className={cls.filter(Boolean).join(' ')}>
              <span className="plano-num">{d.getDate()}</span>
              {evs.map((e) => <Chip key={String(e.id)} a={e} onClick={() => editar(e)} />)}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function CopiarPlano({ c, onClose }: { c: Row; onClose: () => void }) {
  const ciclos = useList('/anos-lectivos').rows.filter((x) => x.id !== c.id)
  const [origem, setOrigem] = useState('')
  const copiar = useAct(() => api.post(`/anos-lectivos/${c.id}/plano/copiar`, { origem_id: Number(origem) }), {
    invalidate: INVALIDAR,
    ok: (r: Row) => `${r.copiadas} actividade(s) copiada(s)` + (r.repetidas ? `, ${r.repetidas} já existia(m)` : '')
      + (r.fora_do_ciclo ? `, ${r.fora_do_ciclo} ficaria(m) fora das datas do ciclo` : '') + '.',
    onDone: onClose,
  })
  return (
    <Modal title="Copiar o plano de outro ciclo" onClose={onClose} footer={<>
      <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      <Btn disabled={!origem} busy={copiar.isPending} onClick={() => copiar.mutate()}>Copiar</Btn>
    </>}>
      {ciclos.length
        ? <Select label="Ciclo de origem" placeholder="Escolha o ciclo…" value={origem} onChange={setOrigem}
          options={ciclos.map((x) => ({ value: String(x.id), label: nomeCiclo(x) }))} />
        : <Empty>Não há outro ciclo de onde copiar.</Empty>}
    </Modal>
  )
}

type Vista = 'semanas' | 'mes' | 'lista'

/** Plano de actividades do ciclo, organizado pelas fases do ano lectivo. */
export function Plano({ c }: { c: Row }) {
  const [vista, setVista] = useState<Vista>('semanas')
  const [nova, setNova] = useState(false)
  const [copiar, setCopiar] = useState(false)
  const [aEditar, setAEditar] = useState<Row | null>(null)
  const encerrado = String(c.estado) === 'encerrado'
  const cal = useGet<Row>(`/anos-lectivos/${c.id}/semanas`)
  const eventos = useList('/eventos', { desde: pick(c, 'data_inicio'), ate: pick(c, 'data_fim') })
  const criar = useAct((p: Row) => api.post('/eventos', p), { invalidate: INVALIDAR, ok: 'Actividade criada.', onDone: () => setNova(false) })
  const guardar = useAct(({ id, p }: { id: unknown; p: Row }) => api.patch(`/eventos/${id}`, p), {
    invalidate: INVALIDAR, ok: 'Actividade guardada.', onDone: () => setAEditar(null),
  })
  const editar = (a: Row) => { if (!encerrado) setAEditar(eventos.rows.find((e) => e.id === a.id) ?? a) }
  const periodos = (cal.data?.periodos as Row[]) ?? []

  return (
    <>
      <div className="grid" style={{ marginBottom: 16 }}>
        <Kpi label="Semanas lectivas" value={cal.data ? String(cal.data.semanas_lectivas) : '…'} hint={cal.data ? `${cal.data.dias_lectivos} dias com aulas` : undefined} />
        {periodos.map((p) => <Kpi key={String(p.id)} label={String(p.designacao)} value={`${p.semanas_lectivas} semanas`}
          hint={`${dataPT(p.data_inicio)} a ${dataPT(p.data_fim)} · ${p.dias_lectivos} dias com aulas`} />)}
      </div>
      {cal.data && !periodos.length && <p className="note">Este ciclo ainda não tem trimestres (Períodos).</p>}

      <div className="plano-barra">
        <Tabs<Vista> tabs={[['semanas', 'Por semanas'], ['mes', 'Calendário mensal'], ['lista', 'Lista']]} value={vista} onChange={setVista} />
        {!encerrado && <div className="row-a">
          <Btn variant="ghost" onClick={() => setCopiar(true)}>Copiar de outro ciclo</Btn>
          {vista !== 'lista' && <Btn onClick={() => setNova(true)}>Nova actividade</Btn>}
        </div>}
      </div>
      {vista !== 'lista' && <Legenda />}

      {vista === 'lista' ? (
        <Resource
          path="/eventos"
          params={{ desde: pick(c, 'data_inicio'), ate: pick(c, 'data_fim') }}
          invalidate={INVALIDAR}
          createLabel="Nova actividade"
          createFields={encerrado ? undefined : actividadeFields}
          createInitial={{ data_inicio: pick(c, 'data_inicio') }}
          crud={encerrado ? undefined : '/eventos'}
          deleteName={(r) => String(r.titulo)}
          search
          empty="O plano de actividades deste ciclo ainda está vazio."
          cols={[
            { h: 'Data', render: (r) => (r.data_fim && r.data_fim !== r.data_inicio ? `${dataPT(r.data_inicio)} a ${dataPT(r.data_fim)}` : dataPT(r.data_inicio)) },
            { h: 'Actividade', k: 'titulo' },
            { h: 'Tipo / fase', render: (r) => <span className="plano-tipo" style={{ ['--cor' as string]: tipoDe(r.tipo).cor }}>{tipoDe(r.tipo).label}</span> },
            { h: 'Responsável', render: (r) => String(r.responsavel ?? '—') },
            { h: 'Famílias', render: (r) => (r.publico === false ? <Tag>Interna</Tag> : <Tag tone="ok">Visível</Tag>) },
          ]}
        />
      ) : cal.isLoading ? <Loading /> : cal.error ? <ErrorBox error={cal.error} retry={() => cal.refetch()} />
        : vista === 'semanas' ? <Semanas cal={cal.data ?? {}} editar={editar} />
          : <Mes c={c} eventos={eventos.rows} periodos={periodos} editar={editar} />}

      {nova && <FormDialog title="Nova actividade" fields={actividadeFields} initial={{ data_inicio: pick(c, 'data_inicio') }}
        submitLabel="Criar" onSubmit={(p) => criar.mutateAsync(p)} onClose={() => setNova(false)} />}
      {aEditar && <FormDialog title="Editar actividade" fields={actividadeFields} initial={aEditar}
        onSubmit={(p) => guardar.mutateAsync({ id: aEditar.id, p })} onClose={() => setAEditar(null)} />}
      {copiar && <CopiarPlano c={c} onClose={() => setCopiar(false)} />}
    </>
  )
}
