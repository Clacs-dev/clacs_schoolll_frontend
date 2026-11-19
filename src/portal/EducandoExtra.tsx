import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { Table } from '@/components/Table'
import { Btn, Card, Empty, ErrorBox, Kpi, Loading, Tag } from '@/components/ui'
import { api } from '@/lib/api'
import { asList, type Row } from '@/lib/data'
import { Kz, dataPT, fmtNota, type Tone } from '@/lib/format'
import { useAct, useGet } from '@/lib/hooks'

const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const hora = (v: unknown) => String(v ?? '').slice(0, 5)

/* ------------ Horário da turma do educando ------------ */
export function HorarioEducando({ id }: { id: string }) {
  const q = useGet<Row[]>(`/portal/educandos/${id}/horario`)
  if (q.isLoading) return <Loading />
  if (q.isError) return <ErrorBox error={q.error} retry={() => q.refetch()} />
  const rows = asList(q.data)
  if (!rows.length) return <Empty>A turma ainda não tem horário.</Empty>
  const dias = DIAS.map((l, i) => ({ value: i + 1, label: l })).filter((d) => d.value <= 5 || rows.some((r) => r.dia_semana === d.value))
  const faixas = [...new Set(rows.map((r) => `${hora(r.hora_inicio)}–${hora(r.hora_fim)}`))].sort()
  return (
    <Card title={`Horário da turma ${String(rows[0].turma ?? '')}`} pad={false}>
      <div className="mapa-horario">
        <table>
          <thead><tr><th scope="col">Hora</th>{dias.map((d) => <th key={d.value} scope="col">{d.label}</th>)}</tr></thead>
          <tbody>
            {faixas.map((f) => (
              <tr key={f}>
                <th scope="row">{f}</th>
                {dias.map((d) => (
                  <td key={d.value}>
                    {rows.filter((r) => r.dia_semana === d.value && `${hora(r.hora_inicio)}–${hora(r.hora_fim)}` === f).map((r) => (
                      <div key={String(r.id)} className="mh-aula" style={{ cursor: 'default' }}>
                        <b>{String(r.disciplina ?? '').toUpperCase()}</b>
                        <span>{String(r.professor ?? '')}</span>
                      </div>
                    ))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/* ------------ Saúde: ocorrências partilhadas e instruções de medicação ------------ */
const ESTADO_MEDICACAO: Record<string, [Tone, string]> = {
  pendente: ['wa', 'Por autorizar'], autorizada: ['ok', 'Autorizada'], recusada: ['er', 'Recusada'], terminada: ['n', 'Terminada'],
}
const DESFECHO: Record<string, string> = { ficou_na_escola: 'Ficou na escola', recolhido: 'Recolhido pela família', encaminhado: 'Encaminhado' }

function NovaMedicacao({ id, onClose }: { id: string; onClose: () => void }) {
  const [v, setV] = useState<Record<string, string>>({ data_inicio: new Date().toLocaleDateString('sv-SE') })
  const [receita, setReceita] = useState<File | null>(null)
  const [confirmo, setConfirmo] = useState(false)
  const set = (k: string) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }))
  const enviar = useAct(() => {
    const f = new FormData()
    Object.entries(v).forEach(([k, x]) => { if (x) f.append(k, x) })
    f.append('confirmo', String(confirmo))
    if (receita) f.append('receita', receita)
    return api.form(`/portal/educandos/${id}/medicacao`, f)
  }, { invalidate: [`/portal/educandos/${id}/saude`], ok: 'Instrução enviada. A escola vai autorizar ou recusar.', onDone: onClose })
  const pronto = v.medicamento && v.dose && v.horario && v.data_inicio && confirmo
  return (
    <Modal title="Nova instrução de medicação" onClose={onClose} footer={<>
      <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      <Btn disabled={!pronto} busy={enviar.isPending} onClick={() => enviar.mutate()}>Enviar</Btn>
    </>}>
      <div className="fgrid">
        <label className="fld">Medicamento *<input value={v.medicamento ?? ''} onChange={set('medicamento')} placeholder="Ex.: Paracetamol xarope" /></label>
        <label className="fld">Dose *<input value={v.dose ?? ''} onChange={set('dose')} placeholder="Ex.: 5 ml" /></label>
        <label className="fld wide">Quando dar *<input value={v.horario ?? ''} onChange={set('horario')} placeholder="Ex.: 12:30, ou se tiver febre acima de 38 graus" /></label>
        <label className="fld">Desde *<input type="date" value={v.data_inicio ?? ''} onChange={set('data_inicio')} /></label>
        <label className="fld">Até<input type="date" value={v.data_fim ?? ''} onChange={set('data_fim')} /></label>
        <label className="fld wide">Outras instruções<textarea rows={2} value={v.instrucoes ?? ''} onChange={set('instrucoes')} /></label>
        <label className="fld wide">Receita ou prescrição (PDF ou imagem)<input type="file" accept="application/pdf,image/*" onChange={(e) => setReceita(e.target.files?.[0] ?? null)} /></label>
        <label className="fld wide inline-chk" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><input type="checkbox" checked={confirmo} onChange={(e) => setConfirmo(e.target.checked)} /> <span>Confirmo que estas instruções são minhas e estão correctas</span></label>
      </div>
    </Modal>
  )
}

export function SaudeEducando({ id }: { id: string }) {
  const [nova, setNova] = useState(false)
  const q = useGet<Row>(`/portal/educandos/${id}/saude`)
  if (q.isLoading) return <Loading />
  if (q.isError) return <ErrorBox error={q.error} retry={() => q.refetch()} />
  const ocorrencias = asList(q.data?.ocorrencias), medicacao = asList(q.data?.medicacao)
  return (
    <div className="stack">
      <Card title="Medicação na escola" actions={<Btn size="sm" onClick={() => setNova(true)}>Nova instrução</Btn>} pad={false}>
        <Table rows={medicacao} pageSize={0} empty="Não há instruções de medicação." cols={[
          { h: 'Medicamento', render: (r) => <b>{String(r.medicamento)}</b> },
          { h: 'Dose', k: 'dose' },
          { h: 'Quando', k: 'horario', nowrap: false },
          { h: 'Período', render: (r) => (r.data_fim ? `${dataPT(r.data_inicio)} a ${dataPT(r.data_fim)}` : `Desde ${dataPT(r.data_inicio)}`) },
          { h: 'Estado', render: (r) => { const [t, l] = ESTADO_MEDICACAO[String(r.estado)] ?? ['n' as Tone, String(r.estado)]; return <Tag tone={t}>{l}</Tag> } },
          { h: 'Nota da escola', render: (r) => String(r.motivo ?? ''), nowrap: false },
        ]} />
      </Card>
      <Card title="Ocorrências de saúde" pad={false}>
        <Table rows={ocorrencias} pageSize={0} empty="Não há ocorrências de saúde partilhadas pela escola." cols={[
          { h: 'Data', render: (r) => dataPT(r.data_hora, true) },
          { h: 'O que aconteceu', k: 'descricao', nowrap: false },
          { h: 'O que se fez', render: (r) => String(r.medidas ?? '—'), nowrap: false },
          { h: 'Desfecho', render: (r) => DESFECHO[String(r.desfecho)] ?? '—' },
        ]} />
      </Card>
      {nova && <NovaMedicacao id={id} onClose={() => setNova(false)} />}
    </div>
  )
}

/* ------------ Documentos do educando ------------ */
const ESTADO_DOC: Record<string, [Tone, string]> = { recebido: ['wa', 'Por validar'], aceite: ['ok', 'Aceite'], rejeitado: ['er', 'Rejeitado'] }

export function DocumentosEducando({ id }: { id: string }) {
  const q = useGet<Row>(`/portal/educandos/${id}/documentos`)
  const [tipo, setTipo] = useState('')
  const [ficheiro, setFicheiro] = useState<File | null>(null)
  const enviar = useAct(() => {
    const f = new FormData()
    f.append('tipo', tipo)
    f.append('ficheiro', ficheiro as File)
    return api.form(`/portal/educandos/${id}/documentos`, f)
  }, { invalidate: [`/portal/educandos/${id}/documentos`], ok: 'Documento enviado. A secretaria vai validar.', onDone: () => { setTipo(''); setFicheiro(null) } })
  if (q.isLoading) return <Loading />
  if (q.isError) return <ErrorBox error={q.error} retry={() => q.refetch()} />
  const docs = asList(q.data?.documentos), falta = asList(q.data?.em_falta)
  const nomeTipo = (t: unknown) => String(falta.find((x) => x.tipo === t)?.nome ?? String(t ?? '').replace(/_/g, ' '))
  return (
    <div className="stack">
      <Card title="Enviar documento">
        {falta.length > 0 && (
          <p style={{ marginTop: 0 }}>Em falta: {falta.map((d) => <Tag key={String(d.tipo)} tone={d.obrigatorio ? 'wa' : 'n'}>{String(d.nome)}</Tag>)}</p>
        )}
        <div className="toolbar" style={{ margin: 0 }}>
          <select aria-label="Documento" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Escolha o documento</option>
            {falta.map((d) => <option key={String(d.tipo)} value={String(d.tipo)}>{String(d.nome)}</option>)}
            <option value="outro">Outro documento</option>
          </select>
          <input type="file" aria-label="Ficheiro" accept="application/pdf,image/*" onChange={(e) => setFicheiro(e.target.files?.[0] ?? null)} />
          <Btn disabled={!tipo || !ficheiro} busy={enviar.isPending} onClick={() => enviar.mutate()}>Enviar</Btn>
        </div>
      </Card>
      <Card title="Documentos entregues" pad={false}>
        <Table rows={docs} pageSize={0} empty="Ainda não entregou nenhum documento pelo portal." cols={[
          { h: 'Documento', render: (r) => nomeTipo(r.tipo) },
          { h: 'Entregue', render: (r) => dataPT(r.criado_em) },
          { h: 'Validade', render: (r) => (r.validade ? dataPT(r.validade) : '—') },
          { h: 'Estado', render: (r) => { const [t, l] = ESTADO_DOC[String(r.estado)] ?? ['n' as Tone, String(r.estado)]; return <Tag tone={t}>{l}</Tag> } },
          { h: 'Observação', render: (r) => String(r.observacao ?? ''), nowrap: false },
        ]} />
      </Card>
    </div>
  )
}

/* ------------ Ficha do aluno (dados e contactos) ------------ */
export function FichaEducando({ id }: { id: string }) {
  const q = useGet<Row>(`/portal/educandos/${id}/ficha`)
  if (q.isLoading) return <Loading />
  if (q.isError) return <ErrorBox error={q.error} retry={() => q.refetch()} />
  const f = q.data ?? {}
  const dados: [string, unknown][] = [
    ['Nome', f.nome_completo], ['Morada', f.morada], ['BI / cédula', f.bi_numero], ['Grupo sanguíneo', f.grupo_sanguineo],
    ['Alergias', f.alergias], ['Condições de saúde', f.condicoes_saude], ['Medicação habitual', f.medicacao],
    ['Necessidades especiais', f.necessidades_especiais], ['Contacto de emergência', [f.contacto_emergencia, f.telefone_emergencia].filter(Boolean).join(' · ')],
  ]
  const avisos = asList(f.avisos)
  return (
    <div className="stack">
      {avisos.length > 0 && <Card title="A corrigir"><ul className="ficha-lista">{avisos.map((a, i) => <li key={i}>{String(a)}</li>)}</ul></Card>}
      <Card title="Dados do aluno">
        <table className="ficha-ident"><tbody>
          {dados.map(([k, v]) => <tr key={k}><th>{k}</th><td>{v ? String(v) : '—'}</td></tr>)}
        </tbody></table>
      </Card>
      <Card title="Contactos" pad={false}>
        <Table rows={asList(f.contactos)} rowKey={(r, i) => `${r.encarregado_id}-${i}`} pageSize={0} empty="Sem contactos ligados." cols={[
          { h: 'Nome', render: (r) => <>{String(r.nome_completo)}{r.principal ? <> <Tag tone="ok">Principal</Tag></> : null}</> },
          { h: 'Parentesco', render: (r) => String(r.parentesco ?? '') },
          { h: 'Telefone', render: (r) => String(r.telefone ?? '—') },
          { h: 'WhatsApp', render: (r) => String(r.whatsapp ?? '—') },
          { h: 'E-mail', render: (r) => String(r.email ?? '—') },
          { h: 'Paga as propinas', render: (r) => (r.responsavel_financeiro ? 'Sim' : '') },
        ]} />
      </Card>
      <p className="note">Algum dado errado? Faça um pedido à escola em «Pedidos à escola».</p>
    </div>
  )
}

/* ------------ Situação do educando ------------ */
const COMPORTAMENTO: Record<string, [Tone, string]> = { bom: ['ok', 'Bom'], regular: ['wa', 'Regular'], atencao: ['er', 'Requer atenção'] }

export function SituacaoEducando({ d }: { d: Row | undefined }) {
  const cob = asList(d?.cobrancas)
  const abertas = cob.filter((c) => c.estado !== 'paga' && Number(c.valor_em_aberto) > 0)
  const comp = COMPORTAMENTO[String(d?.comportamento)]
  return (
    <div className="stack">
      <div className="grid">
        <Kpi label="Turma" value={String(d?.turma ?? '—')} />
        <Kpi label="Média" value={d?.media != null ? fmtNota(d.media) : '—'} />
        <Kpi label="Faltas" value={String(d?.faltas ?? 0)} tone={Number(d?.faltas) > 0 ? 'warn' : undefined} />
        <Kpi label="Comportamento" value={comp ? comp[1] : '—'} tone={comp?.[0] === 'er' ? 'bad' : comp?.[0] === 'wa' ? 'warn' : undefined} />
        <Kpi label="Em dívida" value={Kz(d?.em_divida)} tone={Number(d?.em_divida) > 0 ? 'bad' : 'good'} />
      </div>
      <Card title="Cobranças por pagar" pad={false}>
        <Table rows={abertas} rowKey={(c, i) => `${c.cobranca_id ?? i}`} pageSize={0} empty="Não há cobranças por pagar." cols={[
          { h: 'Descrição', render: (c) => String(c.descricao ?? c.servico ?? '') },
          { h: 'Vencimento', render: (c) => dataPT(c.vencimento) },
          { h: 'Em aberto', right: true, render: (c) => Kz(c.valor_em_aberto) },
          { h: 'Atraso', render: (c) => (Number(c.dias_atraso) > 0 ? <Tag tone="er">{String(c.dias_atraso)} dias</Tag> : '') },
        ]} />
      </Card>
    </div>
  )
}
