import { Link, useNavigate } from 'react-router'
import { AutoSections } from '@/components/Auto'
import { Card, Empty, ErrorBox, Estado, Kpi, Loading } from '@/components/ui'
import { Icone } from '@/components/Icone'
import { asList, nameOf, num, pick, type Row } from '@/lib/data'
import { Kz, dataPT } from '@/lib/format'
import { useGet, useList } from '@/lib/hooks'

const TIPOS: Record<string, string> = {
  matricula: 'Matrículas e inscrições', abertura: 'Abertura do ano lectivo', aulas: 'Aulas', prova: 'Provas',
  exame: 'Exames', recurso: 'Exames de recurso', entrega: 'Entrega de boletins e certificados', reuniao: 'Reunião',
  evento: 'Actividade', pausa: 'Pausa (sem aulas)', ferias: 'Férias (sem aulas)', feriado: 'Feriado',
  interrupcao: 'Interrupção lectiva',
}

/** Actividades que a escola marcou como visíveis às famílias (Plano de actividade), de hoje em diante. */
function Actividades() {
  const q = useList('/portal/calendario')
  return (
    <Card title="Próximas actividades da escola">
      {q.isLoading ? <Loading /> : !q.rows.length ? <Empty>Não há actividades marcadas para os próximos dias.</Empty> : (
        <ul className="portal-act">
          {q.rows.slice(0, 12).map((e) => {
            const d = new Date(String(e.data_inicio))
            const ok = !Number.isNaN(d.getTime())
            return (
              <li key={e.id}>
                <span className="dia" aria-hidden="true">
                  <b>{ok ? d.getDate() : '—'}</b>
                  <small>{ok ? d.toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '') : ''}</small>
                </span>
                <span className="txt">
                  <b>{e.titulo}</b>
                  <span>{TIPOS[String(e.tipo)] ?? e.tipo}{e.descricao ? ` · ${e.descricao}` : ''}</span>
                </span>
                <span className="mu" style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                  {e.data_fim && e.data_fim !== e.data_inicio ? `${dataPT(e.data_inicio)} a ${dataPT(e.data_fim)}` : dataPT(e.data_inicio)}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

const CORES = ['#d6047f', '#3f9fdb', '#8fb31c', '#f08a24']

export default function Resumo() {
  const nav = useNavigate()
  const q = useGet<Row>('/portal/eu')
  if (q.isLoading) return <Loading />
  if (q.isError) return <ErrorBox error={q.error} retry={() => q.refetch()} />
  const d = q.data || {}
  const educandos = asList(pick(d, 'educandos', 'alunos', 'filhos'))
  const enc = pick(d, 'encarregado') ?? d
  const total = educandos.reduce((s, e) => s + num(pick(e, 'em_divida', 'valor_em_divida', 'financeiro.em_divida', 'divida', 'financeiro.divida')), 0)

  return (
    <>
      <section className="home-hero" aria-label="Boas-vindas">
        <p className="eyebrow">{new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h2>Olá, {String(pick(enc, 'nome_completo', 'nome') ?? nameOf(enc)).split(' ')[0]}.</h2>
        <p>Resumo dos seus educandos: propinas, notas e comunicados do colégio.</p>
        <div className="home-accoes">
          <Link to="/portal/cobrancas" className="pri"><Icone n="financeiro" size={17} /> Pagar propinas</Link>
          <Link to="/portal/pedidos"><Icone n="doc" size={17} /> Fazer um pedido</Link>
          <Link to="/portal/mensagens"><Icone n="comunicacao" size={17} /> Mensagens</Link>
        </div>
      </section>
      <div className="grid" style={{ marginBottom: 16 }}>
        <Kpi label="Educandos" value={educandos.length} icon="pessoas" />
        <Kpi label="Total em dívida" value={Kz(total)} tone={total > 0 ? 'bad' : 'good'} icon={total > 0 ? 'alerta' : 'visto'}
          hint={total > 0 ? 'Toque para ver e pagar' : 'Tudo em dia'} onClick={() => nav('/portal/cobrancas')} />
      </div>
      {educandos.length ? (
        <div className="grid g2">
          {educandos.map((e: Row, i) => {
            const id = pick(e, 'id', 'aluno_id', 'aluno.id')
            const divida = num(pick(e, 'em_divida', 'valor_em_divida', 'financeiro.em_divida', 'divida', 'financeiro.divida'))
            const nomeE = String(pick(e, 'nome_completo', 'nome', 'aluno.nome_completo') ?? 'Educando')
            const turma = pick(e, 'turma', 'turma.designacao')
            const ini = nomeE.split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase()
            return (
              <Card key={id ?? i} className="educando-c">
                <div className="educando-cab">
                  <span className="educando-av" style={{ background: CORES[i % CORES.length] }} aria-hidden="true">{ini}</span>
                  <div><h3>{nomeE}</h3>{turma ? <small>Turma {nameOf(turma)}</small> : null}</div>
                </div>
                <div className="educando-linhas">
                  <div><span>Situação financeira</span><Estado v={divida > 0 ? 'divida' : 'pago'} text={divida > 0 ? `Em dívida: ${Kz(divida)}` : 'Em dia'} /></div>
                  {pick(e, 'media', 'media_geral') !== undefined && <div><span>Média</span><b>{String(pick(e, 'media', 'media_geral'))}</b></div>}
                </div>
                {id && <Link className="btn tonal" to={`/portal/educandos/${id}`}>Ver ficha completa <Icone n="seta" size={16} /></Link>}
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
