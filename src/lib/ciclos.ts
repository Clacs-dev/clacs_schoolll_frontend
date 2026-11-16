import { pick, type Row } from './data'
import { isActivo } from './academic'
import { useList } from './hooks'

/**
 * Um ciclo académico é um ano lectivo (/anos-lectivos). Funciona como as empresas no Primavera: cada ciclo
 * tem o seu plano de actividades, as suas turmas, os seus horários e as cargas horárias.
 */
export function useCiclos() {
  const q = useList('/anos-lectivos')
  const ciclos = [...q.rows].sort((a, b) => String(pick(b, 'data_inicio') ?? '').localeCompare(String(pick(a, 'data_inicio') ?? '')))
  return { ...q, ciclos }
}

export const nomeCiclo = (c: Row | undefined) => String(pick(c, 'designacao', 'nome') ?? (c ? `#${c.id}` : ''))

export const estadoCiclo = (c: Row) => (isActivo(c) ? 'activo' : String(pick(c, 'estado') ?? 'planeado'))

const maisUmAno = (d: unknown) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d ?? ''))
  if (!m) return undefined
  // 29 de Fevereiro passa a 28 num ano comum
  const ano = Number(m[1]) + 1
  const dia = m[2] === '02' && m[3] === '29' && !(ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0)) ? '28' : m[3]
  return `${ano}-${m[2]}-${dia}`
}

/**
 * Valores do próximo ciclo a partir do mais recente: "2026/2027" → "2027/2028", com as datas um ano depois.
 * Sem ciclos ainda, devolve vazio (o utilizador indica o primeiro ano).
 */
export function proximoCiclo(ciclos: Row[]): Row {
  const ultimo = ciclos[0]
  if (!ultimo) return {}
  const m = /^(\d{4})\s*([/-])\s*(\d{4})$/.exec(nomeCiclo(ultimo).trim())
  const v: Row = { data_inicio: maisUmAno(pick(ultimo, 'data_inicio')), data_fim: maisUmAno(pick(ultimo, 'data_fim')) }
  if (m) v.designacao = `${Number(m[1]) + 1}${m[2]}${Number(m[3]) + 1}`
  return v
}
