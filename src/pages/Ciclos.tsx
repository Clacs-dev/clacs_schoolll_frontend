import { Resource } from '@/components/Resource'
import { Btn, Estado, PageHead, Tag } from '@/components/ui'
import type { FieldDef } from '@/components/FormDialog'
import { pick } from '@/lib/data'
import { estadoCiclo, proximoCiclo, useCicloActual } from '@/lib/ciclos'
import { dataPT, label } from '@/lib/format'
import { AccoesCiclo } from './Ciclo'

const campos: FieldDef[] = [
  { name: 'designacao', label: 'Ano do ciclo', required: true, placeholder: 'Ex.: 2026/2027', hint: 'Os ciclos seguintes são preenchidos automaticamente com o ano seguinte.' },
  { name: 'data_inicio', label: 'Início', type: 'date', required: true },
  { name: 'data_fim', label: 'Fim', type: 'date', required: true },
]

/** Gestão dos ciclos académicos (como as empresas no CLACS GeoModel). O ciclo em que se trabalha escolhe-se no topo. */
export default function Ciclos() {
  const { ciclos, ciclo: actual, mudar } = useCicloActual()

  return (
    <>
      <PageHead title="Ciclos académicos" sub="Cada ciclo é um ano lectivo. Toda a plataforma (secretaria, pedagógico, financeiro…) trabalha no ciclo escolhido no topo; um ciclo encerrado fica só de consulta, excepto receber pagamentos das suas dívidas. Clique num ciclo para o gerir." />
      <Resource
        path="/anos-lectivos"
        createLabel="Novo ciclo académico"
        createFields={[...campos, { name: 'criar_trimestres', label: 'Períodos', type: 'checkbox', hint: 'Criar os 3 trimestres automaticamente', default: true }]}
        createInitial={proximoCiclo(ciclos)}
        editFields={campos}
        editPath={(r) => `/anos-lectivos/${r.id}`}
        deletePath={(r) => `/anos-lectivos/${r.id}`}
        empty="Ainda não há ciclos académicos. Crie o primeiro indicando o ano (ex.: 2026/2027)."
        expand={(r) => (
          <div style={{ display: 'grid', gap: 8 }}>
            <span className="mu">Gestão do ciclo {String(pick(r, 'designacao'))}:</span>
            <AccoesCiclo c={r} ciclos={ciclos} />
          </div>
        )}
        cols={[
          { h: 'Ciclo', render: (r) => <>{String(pick(r, 'designacao'))} {actual?.id === r.id && <Tag tone="ok">Em uso</Tag>}</> },
          { h: 'Início', render: (r) => dataPT(pick(r, 'data_inicio')) },
          { h: 'Fim', render: (r) => dataPT(pick(r, 'data_fim')) },
          { h: 'Estado', render: (r) => <Estado v={estadoCiclo(r)} text={label(estadoCiclo(r))} /> },
        ]}
        rowActions={(r) => actual?.id !== r.id && <Btn variant="link" onClick={() => mudar(r.id)}>Trabalhar neste ciclo</Btn>}
      />
    </>
  )
}
