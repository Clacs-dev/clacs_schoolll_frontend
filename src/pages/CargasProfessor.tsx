import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Table } from '@/components/Table'
import { Btn, Card, Empty, Loading, Select } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { api, errMsg } from '@/lib/api'
import { dataDoCiclo, horasTexto } from '@/lib/cargas'
import { nomeCiclo } from '@/lib/ciclos'
import { pick, type Row } from '@/lib/data'
import { useList } from '@/lib/hooks'

const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const hora = (v: unknown) => String(v ?? '').slice(0, 5)
const minutos = (h: unknown) => {
  const [hh, mm] = hora(h).split(':').map(Number)
  return Number.isNaN(hh) || Number.isNaN(mm) ? 0 : hh * 60 + mm
}
const duracao = (r: Row) => Math.max(0, minutos(r.hora_fim) - minutos(r.hora_inicio))

type CargaProfessor = { id: unknown; professor: string; tempos: number; minutos: number; turmas: Set<string>; disciplinas: Set<string> }

/** Grelha do professor como o horário do docente em papel: os tempos da escola em linhas (intervalos a cinzento),
 *  segunda a sábado em colunas; em cada aula a sigla da disciplina, a turma e a sala. */
function GrelhaProfessor({ escola, aulas, siglas }: { escola: Row[]; aulas: Row[]; siglas: Map<unknown, string> }) {
  const dias = DIAS.map((l, i) => ({ value: i + 1, label: l })).filter((d) => d.value <= 5 || escola.some((r) => r.dia_semana === d.value))
  const faixas = [...new Map(escola.map((r) => [`${hora(r.hora_inicio)}–${hora(r.hora_fim)}`, r])).values()]
    .sort((a, b) => minutos(a.hora_inicio) - minutos(b.hora_inicio) || minutos(a.hora_fim) - minutos(b.hora_fim))
  const mesma = (a: Row, b: Row) => hora(a.hora_inicio) === hora(b.hora_inicio) && hora(a.hora_fim) === hora(b.hora_fim)
  return (
    <div className="mapa-horario mapa-professor">
      <table>
        <thead><tr><th scope="col">Hora</th>{dias.map((d) => <th key={d.value} scope="col">{d.label}</th>)}</tr></thead>
        <tbody>
          {faixas.map((f, i) => {
            const intervalo = i > 0 && minutos(f.hora_inicio) - minutos(faixas[i - 1].hora_fim) >= 15
            return [
              intervalo && <tr key={`i${i}`} className="mp-intervalo"><td colSpan={dias.length + 1} /></tr>,
              <tr key={i}>
                <th scope="row">{hora(f.hora_inicio)}<br />às<br />{hora(f.hora_fim)}</th>
                {dias.map((d) => {
                  const aqui = aulas.filter((r) => r.dia_semana === d.value && mesma(r, f))
                  return (
                    <td key={d.value} className={aqui.length ? 'com-aula' : ''}>
                      {aqui.map((r) => (
                        <div key={String(r.id)} className="mp-aula" title={String(r.disciplina ?? '')}>
                          <b>{siglas.get(r.disciplina_id) || String(r.disciplina ?? '').toUpperCase()}</b>
                          <span>{String(r.turma ?? '')}</span>
                          {r.sala && <em>(Sala {String(r.sala)})</em>}
                        </div>
                      ))}
                    </td>
                  )
                })}
              </tr>,
            ]
          })}
        </tbody>
      </table>
    </div>
  )
}

/** Carga horária por professor, calculada do horário em vigor do ciclo: lista de todos e o horário de cada um. */
export function CargasPorProfessor({ c }: { c: Row }) {
  const data = dataDoCiclo(c)
  const toast = useToast()
  const horarios = useList('/horarios', { data })
  const discs = useList('/disciplinas')
  const [prof, setProf] = useState('')
  const siglas = useMemo(() => new Map(discs.rows.map((d) => [d.id, String(pick(d, 'sigla') ?? '').toUpperCase()])), [discs.rows])

  const cargas = useMemo(() => {
    const m = new Map<unknown, CargaProfessor>()
    for (const h of horarios.rows) {
      if (!h.funcionario_id) continue
      const x = m.get(h.funcionario_id) ?? { id: h.funcionario_id, professor: String(h.professor ?? '—'), tempos: 0, minutos: 0,
        turmas: new Set<string>(), disciplinas: new Set<string>() }
      x.tempos += 1
      x.minutos += duracao(h)
      x.turmas.add(String(h.turma ?? ''))
      x.disciplinas.add(String(h.disciplina ?? ''))
      m.set(h.funcionario_id, x)
    }
    return [...m.values()].sort((a, b) => a.professor.localeCompare(b.professor))
  }, [horarios.rows])
  const escolhido = cargas.find((x) => String(x.id) === prof)
  const aulas = horarios.rows.filter((h) => String(h.funcionario_id) === prof)
  const semProfessor = horarios.rows.filter((h) => !h.funcionario_id).length

  if (horarios.isLoading) return <Loading />
  if (!horarios.rows.length) {
    return <Empty>O ciclo {nomeCiclo(c)} ainda não tem <Link to="/horarios">horários</Link>.</Empty>
  }
  return (
    <>
      {semProfessor ? <p className="note" style={{ margin: '0 0 12px' }}>{semProfessor} aula(s) sem professor atribuído.</p> : null}
      <Table rows={cargas} pageSize={0} onRow={(r) => setProf(String(r.id))} empty="Nenhuma aula tem professor atribuído." cols={[
        { h: 'Professor', render: (r) => <b>{r.professor}</b> },
        { h: 'Unidades curriculares', render: (r) => [...(r.disciplinas as Set<string>)].sort().join(', ') },
        { h: 'Turmas', render: (r) => [...(r.turmas as Set<string>)].sort().join(', ') },
        { h: 'Tempos / semana', render: (r) => String(r.tempos) },
        { h: 'Carga horária', render: (r) => <b>{horasTexto(Number(r.minutos))}</b> },
      ]} />

      <div className="toolbar" style={{ marginTop: 20 }}>
        <Select label="Professor" value={prof} onChange={setProf} placeholder="Escolha o professor"
          options={cargas.map((x) => ({ value: String(x.id), label: x.professor }))} />
        <span className="grow" />
        {escolhido && <Btn variant="ghost" onClick={() => api.download(`/professores/${prof}/horario.pdf`, { data })
          .catch((e) => toast.error(errMsg(e)))}>Baixar horário do professor (PDF)</Btn>}
      </div>
      {escolhido ? (
        <Card>
          <div className="mp-cabecalho">
            <p><i>Professor:</i> <b className="mp-nome">{escolhido.professor}</b></p>
            <p><i>Unidade curricular:</i> <b><i>{[...escolhido.disciplinas].sort().join('; ')}</i></b></p>
            <p className="mp-carga">Carga horária: <b>{horasTexto(escolhido.minutos)}</b> por semana ({escolhido.tempos} {escolhido.tempos === 1 ? 'tempo' : 'tempos'})</p>
          </div>
          <GrelhaProfessor escola={horarios.rows} aulas={aulas} siglas={siglas} />
        </Card>
      ) : null}
    </>
  )
}
