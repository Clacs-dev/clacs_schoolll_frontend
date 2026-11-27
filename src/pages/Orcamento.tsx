import { useState } from 'react'
import { FormDialog, type FieldDef } from '@/components/FormDialog'
import { useConfirm } from '@/components/Modal'
import { Resource } from '@/components/Resource'
import { Table } from '@/components/Table'
import { Btn, Card, Kpi, Loading, PageHead, Select, Tabs, Tag, Toolbar } from '@/components/ui'
import { api } from '@/lib/api'
import { useCicloActual } from '@/lib/ciclos'
import { asList, type Row } from '@/lib/data'
import { Kz, dataPT, hojeISO, label, primeiroDiaMes } from '@/lib/format'
import { useAct, useGet, useList } from '@/lib/hooks'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const ESTADOS = [{ value: 'rascunho', label: 'Rascunho' }, { value: 'aprovado', label: 'Aprovado' }, { value: 'fechado', label: 'Fechado' }]
const pct = (v: unknown) => (v == null ? '—' : `${Math.round(Number(v))}%`)

const linhaFields: FieldDef[] = [
  { name: 'tipo', label: 'Tipo', type: 'select', required: true, options: [{ value: 'receita', label: 'Receita' }, { value: 'despesa', label: 'Despesa' }] },
  { name: 'categoria', label: 'Categoria', required: true, placeholder: 'Receitas: propina, alimentacao…; despesas: salários, água…' },
  { name: 'mes', label: 'Mês', type: 'select', options: MESES.map((m, i) => ({ value: i + 1, label: m })), hint: 'Em branco: o ano inteiro' },
  { name: 'valor', label: 'Valor previsto (Kz)', type: 'number', required: true, min: 0 },
]

/** Um orçamento: linhas previstas, previsão de receitas e execução (previsto × realizado). */
function DetalheOrcamento({ o }: { o: Row }) {
  const confirm = useConfirm()
  const [nova, setNova] = useState(false)
  const linhas = useList(`/orcamentos/${o.id}/linhas`)
  const exec = useGet<Row>(`/orcamentos/${o.id}/execucao`)
  const prev = useList(`/orcamentos/${o.id}/previsao-receitas`)
  const inv = [`/orcamentos/${o.id}`]
  const criar = useAct((p: Row) => api.post(`/orcamentos/${o.id}/linhas`, p), { invalidate: inv, ok: 'Linha acrescentada.', onDone: () => setNova(false) })
  const apagar = useAct((id: unknown) => api.del(`/orcamentos/${o.id}/linhas/${id}`), { invalidate: inv, ok: 'Linha retirada.' })
  const e = exec.data
  return (
    <div className="stack">
      {e && (
        <div className="grid">
          <Kpi label="Receita prevista" value={Kz(e.receita_prevista)} />
          <Kpi label="Receita realizada" value={Kz(e.receita_realizada)} tone="good" />
          <Kpi label="Despesa prevista" value={Kz(e.despesa_prevista)} />
          <Kpi label="Despesa realizada" value={Kz(e.despesa_realizada)} tone={Number(e.despesa_realizada) > Number(e.despesa_prevista) ? 'bad' : undefined} />
          <Kpi label="Saldo realizado" value={Kz(Number(e.receita_realizada) - Number(e.despesa_realizada))} />
        </div>
      )}
      <Card title="Previsto × realizado por categoria" pad={false}>
        {exec.isLoading ? <Loading /> : (
          <Table rows={asList(e?.categorias)} rowKey={(r, i) => `${r.tipo}-${r.categoria}-${i}`} pageSize={0} empty="Sem linhas nem movimentos." cols={[
            { h: 'Tipo', render: (r) => (r.tipo === 'receita' ? <Tag tone="ok">Receita</Tag> : <Tag tone="wa">Despesa</Tag>) },
            { h: 'Categoria', render: (r) => label(r.categoria) },
            { h: 'Previsto', right: true, render: (r) => Kz(r.previsto) },
            { h: 'Realizado', right: true, render: (r) => Kz(r.realizado) },
            { h: 'Desvio', right: true, render: (r) => Kz(r.desvio) },
            { h: 'Execução', right: true, render: (r) => pct(r.execucao) },
          ]} />
        )}
      </Card>
      <Card title="Mês a mês" pad={false}>
        <Table rows={asList(e?.meses)} rowKey={(r) => `${r.ano}-${r.mes}`} pageSize={0} empty="—" cols={[
          { h: 'Mês', render: (r) => `${MESES[Number(r.mes) - 1]} ${r.ano}` },
          { h: 'Receita prevista', right: true, render: (r) => Kz(r.previsto_receita) },
          { h: 'Receita realizada', right: true, render: (r) => Kz(r.realizado_receita) },
          { h: 'Despesa prevista', right: true, render: (r) => Kz(r.previsto_despesa) },
          { h: 'Despesa realizada', right: true, render: (r) => Kz(r.realizado_despesa) },
        ]} />
      </Card>
      <Card title="Linhas do orçamento" actions={o.estado !== 'fechado' && <Btn icon="mais" size="sm" onClick={() => setNova(true)}>Nova linha</Btn>} pad={false}>
        <Table rows={linhas.rows} loading={linhas.isLoading} pageSize={0} empty="Ainda não há linhas." cols={[
          { h: 'Tipo', render: (r) => (r.tipo === 'receita' ? 'Receita' : 'Despesa') },
          { h: 'Categoria', render: (r) => label(r.categoria) },
          { h: 'Mês', render: (r) => (r.mes ? MESES[Number(r.mes) - 1] : 'Ano inteiro') },
          { h: 'Valor', right: true, render: (r) => Kz(r.valor) },
          { h: '', render: (r) => (o.estado !== 'fechado' ? <Btn variant="link" onClick={async () => { if (await confirm({ title: 'Retirar linha', text: `Retirar ${label(r.categoria)} (${Kz(r.valor)})?`, yes: 'Retirar' })) apagar.mutate(r.id) }}>Retirar</Btn> : null) },
        ]} />
      </Card>
      <Card title="Previsão de receitas (preços × alunos)" pad={false}>
        <Table rows={prev.rows} rowKey={(r) => String(r.categoria)} loading={prev.isLoading} pageSize={0} empty="Sem preços definidos." cols={[
          { h: 'Categoria', render: (r) => label(r.categoria) },
          { h: 'Alunos', right: true, render: (r) => String(r.alunos) },
          { h: 'Valor previsto', right: true, render: (r) => Kz(r.valor) },
        ]} />
      </Card>
      {nova && <FormDialog title="Nova linha do orçamento" fields={linhaFields} initial={{ tipo: 'despesa' }} onSubmit={(p) => criar.mutateAsync(p)} onClose={() => setNova(false)} />}
    </div>
  )
}

function Orcamentos() {
  const { ciclo } = useCicloActual()
  const lista = useList('/orcamentos')
  const [sel, setSel] = useState('')
  const [novo, setNovo] = useState(false)
  const criar = useAct((p: Row) => api.post('/orcamentos', { ...p, ano_id: ciclo?.id }), {
    invalidate: ['/orcamentos'], ok: 'Orçamento criado.', onDone: (r: Row) => { setNovo(false); setSel(String(r.id)) },
  })
  const mudarEstado = useAct((v: { id: unknown; estado: string }) => api.patch(`/orcamentos/${v.id}`, { estado: v.estado }), { invalidate: ['/orcamentos'], ok: 'Estado do orçamento alterado.' })
  const o = lista.rows.find((x) => String(x.id) === sel) ?? lista.rows[0]
  return (
    <>
      <Toolbar>
        <Select label="Orçamento" value={o ? String(o.id) : ''} onChange={setSel} placeholder={lista.rows.length ? undefined : 'Sem orçamentos'}
          options={lista.rows.map((x) => ({ value: String(x.id), label: String(x.designacao) }))} />
        {o && <Select label="Estado" value={String(o.estado)} onChange={(v) => mudarEstado.mutate({ id: o.id, estado: v })} options={ESTADOS} />}
        <span className="grow" />
        <Btn icon="mais" disabled={!ciclo} onClick={() => setNovo(true)}>Novo orçamento</Btn>
      </Toolbar>
      {lista.isLoading ? <Loading /> : o ? <DetalheOrcamento key={String(o.id)} o={o} /> : null}
      {novo && <FormDialog title="Novo orçamento" onClose={() => setNovo(false)} onSubmit={(p) => criar.mutateAsync(p)}
        initial={{ designacao: `Orçamento ${ciclo?.designacao ?? ''}`.trim(), estado: 'rascunho' }}
        fields={[{ name: 'designacao', label: 'Designação', required: true, wide: true }, { name: 'estado', label: 'Estado', type: 'select', options: ESTADOS }]} />}
    </>
  )
}

const despesaFields: FieldDef[] = [
  { name: 'data', label: 'Data', type: 'date', required: true },
  { name: 'categoria', label: 'Categoria', required: true, placeholder: 'Ex.: salários, água, manutenção' },
  { name: 'descricao', label: 'Descrição', required: true, wide: true },
  { name: 'valor', label: 'Valor (Kz)', type: 'number', required: true, min: 0 },
  { name: 'fornecedor', label: 'Fornecedor' },
  { name: 'recorrente', label: 'Recorrente', type: 'checkbox', hint: 'Repete-se todos os meses' },
]

function Despesas() {
  const [desde, setDesde] = useState(primeiroDiaMes())
  const [ate, setAte] = useState(hojeISO())
  const cats = useList('/despesas/categorias', { desde, ate })
  const total = cats.rows.reduce((s, c) => s + Number(c.total), 0)
  return (
    <>
      <Toolbar>
        <label className="row-a" style={{ alignItems: 'center' }}>De <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></label>
        <label className="row-a" style={{ alignItems: 'center' }}>A <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></label>
      </Toolbar>
      {cats.rows.length > 0 && (
        <div className="grid" style={{ marginBottom: 12 }}>
          <Kpi label="Total no período" value={Kz(total)} />
          {cats.rows.slice(0, 5).map((c) => <Kpi key={String(c.categoria)} label={label(c.categoria)} value={Kz(c.total)} hint={`${c.registos} registo(s)`} />)}
        </div>
      )}
      <Resource path="/despesas" params={{ desde, ate }} crud="/despesas" invalidate={['/despesas', '/orcamentos']} createLabel="Nova despesa"
        createFields={despesaFields} createInitial={{ data: hojeISO() }} deleteName={(r) => String(r.descricao)} search
        empty="Não há despesas neste período." cols={[
          { h: 'Data', render: (r) => dataPT(r.data) },
          { h: 'Categoria', render: (r) => label(r.categoria) },
          { h: 'Descrição', k: 'descricao', nowrap: false },
          { h: 'Fornecedor', render: (r) => String(r.fornecedor ?? '—') },
          { h: 'Valor', right: true, render: (r) => Kz(r.valor) },
          { h: '', render: (r) => (r.recorrente ? <Tag tone="n">Recorrente</Tag> : null) },
        ]} />
    </>
  )
}

export default function Orcamento() {
  const [tab, setTab] = useState<'orcamento' | 'despesas'>('orcamento')
  return (
    <>
      <PageHead title="Orçamento e despesas" />
      <Tabs tabs={[['orcamento', 'Orçamento'], ['despesas', 'Despesas']]} value={tab} onChange={setTab} />
      {tab === 'orcamento' ? <Orcamentos /> : <Despesas />}
    </>
  )
}
