import { pick, type Row } from './data'
import { useCicloActual } from './ciclos'
import { useList } from './hooks'

/** Data em que se consulta o horário: hoje, se cair dentro do ciclo; senão o início (ciclo futuro) ou o fim (passado). */
export function dataDoCiclo(c: Row | undefined) {
  const d = new Date().toISOString().slice(0, 10)
  const ini = String(pick(c, 'data_inicio') ?? '')
  const fim = String(pick(c, 'data_fim') ?? '')
  if (ini && d < ini) return ini
  if (fim && d > fim) return fim
  return d
}

const minutos = (h: unknown) => {
  const [hh, mm] = String(h ?? '').split(':').map(Number)
  return Number.isNaN(hh) || Number.isNaN(mm) ? 0 : hh * 60 + mm
}

/** "3h45", "45 min". */
export const horasTexto = (min: number) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`)

export type Carga = { tempos: number; minutos: number; professores: Set<string> }

/**
 * Carga horária semanal calculada a partir do horário em vigor do ciclo escolhido no topo:
 * por turma e disciplina, quantos tempos lectivos há na semana e quanto somam em horas.
 */
export function useCargasDoHorario() {
  const { ciclo } = useCicloActual()
  const turmas = useList(ciclo ? '/turmas' : null, { ano_id: ciclo?.id })
  const horarios = useList(ciclo ? '/horarios' : null, { data: dataDoCiclo(ciclo) })
  const porTurma = new Map<unknown, Map<unknown, Carga>>()
  for (const h of horarios.rows) {
    const t = porTurma.get(h.turma_id) ?? new Map<unknown, Carga>()
    const c = t.get(h.disciplina_id) ?? { tempos: 0, minutos: 0, professores: new Set<string>() }
    c.tempos += 1
    c.minutos += Math.max(0, minutos(h.hora_fim) - minutos(h.hora_inicio))
    if (h.professor) c.professores.add(String(h.professor))
    t.set(h.disciplina_id, c)
    porTurma.set(h.turma_id, t)
  }
  const nomeDisciplina = new Map(horarios.rows.map((h) => [h.disciplina_id, String(h.disciplina ?? '')]))

  /** Carga da disciplina nas turmas de uma classe: "5 tempos" ou, se as turmas diferirem, "5–6 tempos". */
  const daClasse = (classeId: unknown, disciplinaId: unknown) => {
    const valores = turmas.rows.filter((t) => t.classe_id === classeId)
      .map((t) => porTurma.get(t.id)?.get(disciplinaId))
      .filter((c): c is Carga => !!c)
    if (!valores.length) return null
    const tempos = valores.map((c) => c.tempos), mins = valores.map((c) => c.minutos)
    const [tMin, tMax] = [Math.min(...tempos), Math.max(...tempos)]
    const [mMin, mMax] = [Math.min(...mins), Math.max(...mins)]
    return {
      texto: `${tMin === tMax ? tMin : `${tMin}–${tMax}`} tempos (${mMin === mMax ? horasTexto(mMin) : `${horasTexto(mMin)}–${horasTexto(mMax)}`})`,
      tempos: tMax,
    }
  }
  return { ciclo, turmas: turmas.rows, porTurma, nomeDisciplina, daClasse, isLoading: turmas.isLoading || horarios.isLoading }
}
