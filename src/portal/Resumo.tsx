import { Link } from 'react-router'
import { AutoSections } from '@/components/Auto'
import { Card, Empty, ErrorBox, Estado, Kpi, Loading, PageHead } from '@/components/ui'
import { asList, nameOf, num, pick, type Row } from '@/lib/data'
import { Kz, dataPT } from '@/lib/format'
import { useGet, useList } from '@/lib/hooks'

const TIPOS: Record<string, string> = {
  evento: 'Actividade', reuniao: 'Reunião', prova: 'Prova / exame', feriado: 'Feriado', interrupcao: 'Interrupção lectiva',
}

/** Actividades que a escola marcou como visíveis às famílias (Plano de actividade), de hoje em diante. */
function Actividades() {
  const q = useList('/portal/calendario')
  return (
    <Card title="Próximas actividades da escola">
      {q.isLoading ? <Loading /> : !q.rows.length ? <Empty>Não há actividades marcadas para os próximos dias.</Empty> : (
        <ul className="link-list" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {q.rows.slice(0, 12).map((e) => (
            <li key={e.id} className="al" style={{ alignItems: 'flex-start' }}>
              <div>
                <b>{e.titulo}</b>
                <div className="mu" style={{ fontSize: 13 }}>{TIPOS[String(e.tipo)] ?? e.tipo}{e.descricao ? ` · ${e.descricao}` : ''}</div>
              </div>
              <span className="mu" style={{ whiteSpace: 'nowrap' }}>
                {e.data_fim && e.data_fim !== e.data_inicio ? `${dataPT(e.data_inicio)} a ${dataPT(e.data_fim)}` : dataPT(e.data_inicio)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export default function Resumo() {
  const q = useGet<Row>('/portal/eu')
  if (q.isLoading) return <Loading />
  if (q.isError) return <ErrorBox error={q.error} retry={() => q.refetch()} />
  const d = q.data || {}
  const educandos = asList(pick(d, 'educandos', 'alunos', 'filhos'))
  const enc = pick(d, 'encarregado') ?? d
  const total = educandos.reduce((s, e) => s + num(pick(e, 'em_divida', 'valor_em_divida', 'financeiro.em_divida', 'divida', 'financeiro.divida')), 0)

  return (
    <>
      <PageHead title={`Olá, ${String(pick(enc, 'nome_completo', 'nome') ?? nameOf(enc)).split(' ')[0]}`} sub="Resumo dos seus educandos: propinas, notas e comunicados do colégio." />
      <div className="grid" style={{ marginBottom: 16 }}>
        <Kpi label="Educandos" value={educandos.length} />
        <Kpi label="Total em dívida" value={Kz(total)} tone={total > 0 ? 'bad' : 'good'} onClick={() => undefined} />
      </div>
      {educandos.length ? (
        <div className="grid g2">
          {educandos.map((e: Row, i) => {
            const id = pick(e, 'id', 'aluno_id', 'aluno.id')
            const divida = num(pick(e, 'em_divida', 'valor_em_divida', 'financeiro.em_divida', 'divida', 'financeiro.divida'))
            return (
              <Card key={id ?? i} title={String(pick(e, 'nome_completo', 'nome', 'aluno.nome_completo') ?? 'Educando')}>
                <div className="mu" style={{ marginBottom: 8 }}>{pick(e, 'turma', 'turma.designacao') ? `Turma ${nameOf(pick(e, 'turma', 'turma.designacao'))}` : ''}</div>
                <div className="al"><div>Situação financeira</div><Estado v={divida > 0 ? 'divida' : 'pago'} text={divida > 0 ? `Em dívida: ${Kz(divida)}` : 'Em dia'} /></div>
                {pick(e, 'media', 'media_geral') !== undefined && <div className="al"><div>Média</div><b>{String(pick(e, 'media', 'media_geral'))}</b></div>}
                {id && <div style={{ marginTop: 10 }}><Link className="btn ghost" to={`/portal/educandos/${id}`}>Ver detalhe</Link></div>}
              </Card>
            )
          })}
        </div>
      ) : (
        <Card><Empty>Não encontrámos educandos associados à sua conta.</Empty></Card>
      )}
      <div style={{ marginTop: 16 }}><Actividades /></div>
      {!educandos.length && <div style={{ marginTop: 16 }}><AutoSections data={d} /></div>}
    </>
  )
}
