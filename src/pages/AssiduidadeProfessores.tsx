import { useState } from 'react'
import { Table } from '@/components/Table'
import { Btn, Loading, PageHead } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { api, errMsg } from '@/lib/api'
import { pick, type Row } from '@/lib/data'
import { useCicloActual } from '@/lib/ciclos'
import { dataPT, hojeISO, primeiroDiaMes } from '@/lib/format'
import { useList } from '@/lib/hooks'

/** Horas com uma casa decimal só quando é preciso: 30, 22,5. */
const horas = (min: unknown) => (Math.round((Number(min) || 0) / 6) / 10).toLocaleString('pt-PT')
const soma = (rows: Row[], k: string) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0)

/** Mapa de assiduidade dos professores (como o mapa em papel): horas previstas, faltas, leccionadas e atrasos. */
export default function AssiduidadeProfessores() {
  const { ciclo, isLoading } = useCicloActual()
  if (isLoading) return <Loading />
  return <Mapa key={String(ciclo?.id ?? '')} ciclo={ciclo} />
}

function Mapa({ ciclo }: { ciclo?: Row }) {
  const toast = useToast()
  // Por omissão, do início do mês até hoje, dentro das datas do ciclo escolhido no topo.
  const cIni = String(pick(ciclo, 'data_inicio') ?? ''), cFim = String(pick(ciclo, 'data_fim') ?? '')
  let fim = [hojeISO(), cFim].filter(Boolean).sort()[0]
  let inicio = [primeiroDiaMes(new Date(`${fim}T12:00:00`)), cIni].sort().reverse()[0]
  if (inicio > fim) [inicio, fim] = [cIni, cFim]     // ciclo ainda por começar
  const [desde, setDesde] = useState(inicio)
  const [ate, setAte] = useState(fim)
  const valido = !!desde && !!ate && desde <= ate
  const q = useList(valido ? '/professores/assiduidade' : null, { desde, ate })
  const rows = q.rows
  const linhas: Row[] = rows.length ? [...rows, { id: 'total', _total: true, ...Object.fromEntries(
    ['minutos_previstos', 'minutos_faltas', 'minutos_dados', 'minutos_por_registar', 'minutos_atraso'].map((k) => [k, soma(rows, k)])) }] : []
  const n = (r: Row, v: string) => (r._total ? <b>{v}</b> : v)

  return (
    <>
      <PageHead title="Assiduidade dos professores" sub={`Entre ${dataPT(desde)} e ${dataPT(ate)}`} />
      <div className="toolbar">
        <label className="row-a" style={{ alignItems: 'center' }}>De <input type="date" value={desde} max={ate} onChange={(e) => setDesde(e.target.value)} /></label>
        <label className="row-a" style={{ alignItems: 'center' }}>A <input type="date" value={ate} min={desde} onChange={(e) => setAte(e.target.value)} /></label>
        <span className="grow" />
        <Btn variant="ghost" disabled={!valido || !rows.length}
          onClick={() => api.download('/professores/assiduidade.pdf', { desde, ate }).catch((e) => toast.error(errMsg(e)))}>
          Baixar mapa (PDF)</Btn>
      </div>
      <Table rows={linhas} loading={q.isLoading} error={q.error} onRetry={() => q.refetch()} pageSize={0}
        empty="Não há aulas previstas com professor neste período."
        cols={[
          { h: 'Professor', render: (r) => (r._total ? <b>Total</b> : String(r.professor)) },
          { h: 'Previstas (hor.)', right: true, render: (r) => n(r, horas(r.minutos_previstos)) },
          { h: 'Faltas (hor.)', right: true, render: (r) => n(r, horas(r.minutos_faltas)) },
          { h: 'Horas leccio.', right: true, render: (r) => n(r, horas(r.minutos_dados)) },
          { h: 'Por registar (hor.)', right: true, render: (r) => n(r, horas(r.minutos_por_registar)) },
          { h: 'Atraso (min.)', right: true, render: (r) => n(r, String(r.minutos_atraso ?? 0)) },
        ]} />
    </>
  )
}
