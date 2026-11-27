import { useState } from 'react'
import { FormDialog, useOptions, type FieldDef } from '@/components/FormDialog'
import { Modal, useConfirm } from '@/components/Modal'
import { Resource } from '@/components/Resource'
import { Table } from '@/components/Table'
import { Btn, Loading, PageHead, Select, Tabs, Tag, Toolbar } from '@/components/ui'
import { useAuth } from '@/auth/AuthContext'
import { encarregadoOptions } from '@/lib/academic'
import { api } from '@/lib/api'
import { asList, perfisOf, type Row } from '@/lib/data'
import { Kz, dataPT, hojeISO, type Tone } from '@/lib/format'
import { useAct, useGet, useList } from '@/lib/hooks'

const INV = ['/acordos', '/cobrancas', '/portal']
const ESTADO: Record<string, [Tone, string]> = {
  proposto: ['wa', 'Por aprovar'], activo: ['n', 'Em curso'], cumprido: ['ok', 'Cumprido'], cancelado: ['er', 'Cancelado'],
}
const PRESTACAO: Record<string, [Tone, string]> = { paga: ['ok', 'Paga'], parcial: ['wa', 'Paga em parte'], pendente: ['n', 'Por pagar'], atrasada: ['er', 'Em atraso'] }

/** Novo acordo: escolhe-se o encarregado, as dívidas e o plano (por modelo ou personalizado). */
function NovoAcordo({ onClose }: { onClose: () => void }) {
  const [ee, setEe] = useState('')
  const [sel, setSel] = useState<number[]>([])
  const [v, setV] = useState<Record<string, string>>({ primeiro_vencimento: hojeISO(), suspende_multas: 'true' })
  const { opts: encarregados } = useOptions(encarregadoOptions)
  const modelos = useList('/acordos-modelos')
  const dividas = useGet<Row>(ee ? '/cobrancas' : null, { encarregado_id: ee, estado: 'divida' })
  const linhas = asList(dividas.data?.linhas).filter((c) => Number(c.valor_em_aberto) > 0)
  const total = linhas.filter((c) => sel.includes(Number(c.cobranca_id))).reduce((s, c) => s + Number(c.valor_em_aberto), 0)
  const set = (k: string) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }))
  const n = (k: string) => (v[k] ? Number(v[k]) : undefined)
  const criar = useAct(() => api.post('/acordos', {
    encarregado_id: Number(ee), cobranca_ids: sel, motivo: v.motivo, modelo_id: n('modelo_id'), num_prestacoes: n('num_prestacoes'),
    primeiro_vencimento: v.primeiro_vencimento, intervalo_meses: n('intervalo_meses'), entrada_percentual: n('entrada_percentual'),
    suspende_multas: v.suspende_multas === 'true',
  }), { invalidate: INV, ok: 'Acordo proposto. Falta a aprovação da Direcção.', onDone: onClose })
  const pronto = ee && sel.length && (v.motivo ?? '').trim().length >= 5 && v.primeiro_vencimento && (v.modelo_id || v.num_prestacoes)
  return (
    <Modal title="Novo acordo de pagamento" size="lg" onClose={onClose} footer={<>
      <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      <Btn disabled={!pronto} busy={criar.isPending} onClick={() => criar.mutate()}>Propor acordo{total ? ` (${Kz(total)})` : ''}</Btn>
    </>}>
      <div className="stack">
        <Select label="Encarregado" value={ee} onChange={(x) => { setEe(x); setSel([]) }} placeholder="Escolha o encarregado" options={encarregados} />
        {ee && (dividas.isLoading ? <Loading /> : (
          <Table rows={linhas} rowKey={(c) => String(c.cobranca_id)} pageSize={0} empty="Este encarregado não tem dívidas."
            selected={sel} onSelect={(ids) => setSel(ids.map(Number))} cols={[
              { h: 'Educando', k: 'aluno' },
              { h: 'Cobrança', render: (c) => String(c.descricao ?? c.servico ?? '') },
              { h: 'Vencimento', render: (c) => dataPT(c.vencimento) },
              { h: 'Em aberto', right: true, render: (c) => Kz(c.valor_em_aberto) },
            ]} />
        ))}
        <div className="fgrid">
          <label className="fld wide">Motivo *<input value={v.motivo ?? ''} onChange={set('motivo')} placeholder="Ex.: desemprego temporário do encarregado" /></label>
          <label className="fld">Modelo de acordo
            <select value={v.modelo_id ?? ''} onChange={set('modelo_id')}>
              <option value="">Personalizado</option>
              {modelos.rows.filter((m) => m.activo !== false).map((m) => <option key={String(m.id)} value={String(m.id)}>{String(m.nome)}</option>)}
            </select>
          </label>
          <label className="fld">N.º de prestações{v.modelo_id ? '' : ' *'}<input type="number" min={1} max={36} value={v.num_prestacoes ?? ''} onChange={set('num_prestacoes')} /></label>
          <label className="fld">1.º vencimento *<input type="date" value={v.primeiro_vencimento ?? ''} onChange={set('primeiro_vencimento')} /></label>
          <label className="fld">Intervalo (meses)<input type="number" min={1} max={12} value={v.intervalo_meses ?? ''} onChange={set('intervalo_meses')} /></label>
          <label className="fld">Entrada (%)<input type="number" min={0} max={99} value={v.entrada_percentual ?? ''} onChange={set('entrada_percentual')} /></label>
          <label className="fld">Multas durante o acordo
            <select value={v.suspende_multas} onChange={set('suspende_multas')}>
              <option value="true">Suspensas</option><option value="false">Continuam</option>
            </select>
          </label>
        </div>
      </div>
    </Modal>
  )
}

/** Altera o plano de prestações (a soma tem de se manter). */
function AlterarPrestacoes({ a, onClose }: { a: Row; onClose: () => void }) {
  const [linhas, setLinhas] = useState(asList(a.prestacoes).map((p) => ({ valor: String(p.valor), vencimento: String(p.vencimento) })))
  const [motivo, setMotivo] = useState('')
  const soma = linhas.reduce((s, l) => s + (Number(l.valor) || 0), 0)
  const guardar = useAct(() => api.put(`/acordos/${a.id}/prestacoes`, { motivo, prestacoes: linhas.map((l) => ({ valor: Number(l.valor), vencimento: l.vencimento })) }),
    { invalidate: INV, ok: 'Plano de prestações alterado.', onDone: onClose })
  const muda = (i: number, k: 'valor' | 'vencimento', x: string) => setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: x } : l)))
  return (
    <Modal title="Alterar prestações" onClose={onClose} footer={<>
      <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      <Btn disabled={motivo.trim().length < 5 || !linhas.length} busy={guardar.isPending} onClick={() => guardar.mutate()}>Guardar</Btn>
    </>}>
      <div className="stack">
        {linhas.map((l, i) => (
          <div key={i} className="row-a" style={{ alignItems: 'center' }}>
            <span style={{ width: 40 }}>{i + 1}.ª</span>
            <input type="number" step="0.01" aria-label="Valor" value={l.valor} onChange={(e) => muda(i, 'valor', e.target.value)} />
            <input type="date" aria-label="Vencimento" value={l.vencimento} onChange={(e) => muda(i, 'vencimento', e.target.value)} />
            <Btn size="sm" variant="link" onClick={() => setLinhas((ls) => ls.filter((_, j) => j !== i))}>Retirar</Btn>
          </div>
        ))}
        <div className="row-a">
          <Btn size="sm" variant="ghost" onClick={() => setLinhas((ls) => [...ls, { valor: '0', vencimento: hojeISO() }])}>Mais uma prestação</Btn>
          <span className="mu">Soma: {Kz(soma)} (tem de ser igual ao total do acordo, {Kz(a.valor_total)})</span>
        </div>
        <label className="fld">Motivo *<input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: pedido do encarregado: adiar a 2.ª prestação" /></label>
      </div>
    </Modal>
  )
}

function Lista() {
  const { user } = useAuth()
  const aprovador = perfisOf(user).some((p) => p === 'admin' || p === 'direccao')
  const confirm = useConfirm()
  const [estado, setEstado] = useState('')
  const [novo, setNovo] = useState(false)
  const [cancelar, setCancelar] = useState<Row | null>(null)
  const [alterar, setAlterar] = useState<Row | null>(null)
  const params = estado === 'incumprimento' ? { incumprimento: true } : { estado }
  const q = useList('/acordos', params)
  const aprovar = useAct((id: unknown) => api.post(`/acordos/${id}/aprovar`), { invalidate: INV, ok: 'Acordo aprovado: está em curso.' })
  const anular = useAct((p: Row) => api.post(`/acordos/${cancelar!.id}/cancelar`, p), { invalidate: INV, ok: 'Acordo cancelado.', onDone: () => setCancelar(null) })
  return (
    <>
      <Toolbar>
        <Select label="Estado" value={estado} onChange={setEstado} placeholder="Todos" options={[
          { value: 'proposto', label: 'Por aprovar' }, { value: 'activo', label: 'Em curso' }, { value: 'incumprimento', label: 'Em incumprimento' },
          { value: 'cumprido', label: 'Cumpridos' }, { value: 'cancelado', label: 'Cancelados' }]} />
        <span className="grow" />
        <Btn icon="mais" onClick={() => setNovo(true)}>Novo acordo</Btn>
      </Toolbar>
      <Table rows={q.rows} loading={q.isLoading} error={q.error} onRetry={() => q.refetch()} empty="Não há acordos."
        expand={(a) => (
          <div className="stack">
            <Table rows={asList(a.prestacoes)} pageSize={0} cols={[
              { h: 'Prestação', render: (p) => `${p.numero}.ª` },
              { h: 'Vencimento', render: (p) => dataPT(p.vencimento) },
              { h: 'Valor', right: true, render: (p) => Kz(p.valor) },
              { h: 'Pago', right: true, render: (p) => Kz(p.pago) },
              { h: 'Estado', render: (p) => { const [t, l] = PRESTACAO[String(p.estado)] ?? (['n', String(p.estado)] as [Tone, string]); return <Tag tone={t}>{l}</Tag> } },
            ]} />
            <div className="row-a">
              {a.estado === 'proposto' && aprovador && <Btn size="sm" onClick={async () => { if (await confirm({ title: 'Aprovar acordo', text: `Aprovar o acordo de ${a.encarregado} (${Kz(a.valor_total)})?`, yes: 'Aprovar' })) aprovar.mutate(a.id) }}>Aprovar</Btn>}
              {['proposto', 'activo'].includes(String(a.estado)) && <Btn size="sm" variant="ghost" onClick={() => setAlterar(a)}>Alterar prestações</Btn>}
              {['proposto', 'activo'].includes(String(a.estado)) && <Btn size="sm" variant="ghost" onClick={() => setCancelar(a)}>Cancelar acordo</Btn>}
            </div>
          </div>
        )}
        cols={[
          { h: 'Criado', render: (a) => dataPT(a.criado_em) },
          { h: 'Encarregado', k: 'encarregado' },
          { h: 'Motivo', k: 'motivo', nowrap: false },
          { h: 'Total', right: true, render: (a) => Kz(a.valor_total) },
          { h: 'Pago', right: true, render: (a) => Kz(a.pago) },
          { h: 'Falta', right: true, render: (a) => Kz(a.saldo) },
          { h: 'Estado', render: (a) => (a.incumprimento ? <Tag tone="er">Em incumprimento</Tag> : (() => { const [t, l] = ESTADO[String(a.estado)] ?? (['n', String(a.estado)] as [Tone, string]); return <Tag tone={t}>{l}</Tag> })()) },
        ]} />
      {novo && <NovoAcordo onClose={() => setNovo(false)} />}
      {alterar && <AlterarPrestacoes a={alterar} onClose={() => setAlterar(null)} />}
      {cancelar && <FormDialog title={`Cancelar o acordo de ${cancelar.encarregado}`} submitLabel="Cancelar acordo"
        fields={[{ name: 'motivo', label: 'Motivo', type: 'textarea', required: true, wide: true, hint: 'As cobranças voltam ao normal (e às multas)' }]}
        onSubmit={(p) => anular.mutateAsync(p)} onClose={() => setCancelar(null)} />}
    </>
  )
}

const modeloFields: FieldDef[] = [
  { name: 'nome', label: 'Nome', required: true, wide: true, placeholder: 'Ex.: Três prestações mensais' },
  { name: 'num_prestacoes', label: 'N.º de prestações', type: 'number', required: true, min: 1, max: 36 },
  { name: 'intervalo_meses', label: 'Intervalo (meses)', type: 'number', default: 1, min: 1, max: 12 },
  { name: 'entrada_percentual', label: 'Entrada (%)', type: 'number', default: 0, min: 0, max: 99 },
  { name: 'suspende_multas', label: 'Suspende as multas', type: 'checkbox', default: true },
  { name: 'activo', label: 'Activo', type: 'checkbox', default: true },
]

function Modelos() {
  return (
    <Resource path="/acordos-modelos" crud="/acordos-modelos" invalidate={['/acordos-modelos']} createLabel="Novo modelo"
      createFields={modeloFields} deleteName={(r) => String(r.nome)} pageSize={0} empty="Ainda não há modelos de acordo." cols={[
        { h: 'Modelo', k: 'nome' },
        { h: 'Prestações', render: (r) => `${r.num_prestacoes} × de ${r.intervalo_meses} em ${r.intervalo_meses} mês(es)` },
        { h: 'Entrada', render: (r) => `${Number(r.entrada_percentual ?? 0)}%` },
        { h: 'Multas', render: (r) => (r.suspende_multas ? 'Suspensas' : 'Continuam') },
        { h: 'Estado', render: (r) => (r.activo ? <Tag tone="ok">Activo</Tag> : <Tag>Inactivo</Tag>) },
      ]} />
  )
}

export default function Acordos() {
  const [tab, setTab] = useState<'acordos' | 'modelos'>('acordos')
  return (
    <>
      <PageHead title="Acordos de pagamento" />
      <Tabs tabs={[['acordos', 'Acordos'], ['modelos', 'Modelos de acordo']]} value={tab} onChange={setTab} />
      {tab === 'acordos' ? <Lista /> : <Modelos />}
    </>
  )
}
