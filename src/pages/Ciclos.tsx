import { useNavigate } from 'react-router'
import { Resource } from '@/components/Resource'
import { Btn, Estado, PageHead } from '@/components/ui'
import type { FieldDef } from '@/components/FormDialog'
import { api } from '@/lib/api'
import { pick } from '@/lib/data'
import { isActivo } from '@/lib/academic'
import { estadoCiclo, proximoCiclo, useCiclos } from '@/lib/ciclos'
import { dataPT, label } from '@/lib/format'
import { useAct } from '@/lib/hooks'

const campos: FieldDef[] = [
  { name: 'designacao', label: 'Ano do ciclo', required: true, placeholder: 'Ex.: 2026/2027', hint: 'Os ciclos seguintes são preenchidos automaticamente com o ano seguinte.' },
  { name: 'data_inicio', label: 'Início', type: 'date', required: true },
  { name: 'data_fim', label: 'Fim', type: 'date', required: true },
]

export default function Ciclos() {
  const nav = useNavigate()
  const { ciclos } = useCiclos()
  const activar = useAct((id: number) => api.post(`/anos-lectivos/${id}/activar`), { invalidate: ['/anos-lectivos', '/turmas', '/matriculas'], ok: 'Ciclo activado.' })

  return (
    <>
      <PageHead title="Ciclos académicos" sub="Cada ciclo é um ano lectivo, com o seu plano de actividades, turmas, horários e cargas horárias. Abra um ciclo para trabalhar dentro dele." />
      <Resource
        path="/anos-lectivos"
        createLabel="Novo ciclo académico"
        createFields={[...campos, { name: 'criar_trimestres', label: 'Períodos', type: 'checkbox', hint: 'Criar os 3 trimestres automaticamente', default: true }]}
        createInitial={proximoCiclo(ciclos)}
        editFields={campos}
        editPath={(r) => `/anos-lectivos/${r.id}`}
        deletePath={(r) => `/anos-lectivos/${r.id}`}
        empty="Ainda não há ciclos académicos. Crie o primeiro indicando o ano (ex.: 2026/2027)."
        onRow={(r) => nav(`/ciclos/${r.id}`)}
        cols={[
          { h: 'Ciclo', k: ['designacao', 'nome'] },
          { h: 'Início', render: (r) => dataPT(pick(r, 'data_inicio')) },
          { h: 'Fim', render: (r) => dataPT(pick(r, 'data_fim')) },
          { h: 'Estado', render: (r) => <Estado v={estadoCiclo(r)} text={label(estadoCiclo(r))} /> },
        ]}
        rowActions={(r) => (
          <>
            <Btn variant="link" onClick={() => nav(`/ciclos/${r.id}`)}>Abrir</Btn>
            {!isActivo(r) && <Btn variant="link" onClick={() => activar.mutate(r.id)}>Activar</Btn>}
          </>
        )}
      />
    </>
  )
}
