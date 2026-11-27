import { useMemo, useState, type ReactNode } from 'react'
import { api, type Params } from '@/lib/api'
import type { Row } from '@/lib/data'
import { useAct, useList } from '@/lib/hooks'
import { FormDialog, type FieldDef } from './FormDialog'
import { MenuAccoes } from './MenuAccoes'
import { Modal, useConfirm } from './Modal'
import { Table, cell, type Col } from './Table'
import { Btn, SearchBox } from './ui'

type Props = {
  /** Título da secção (mostrado acima da tabela). */
  title?: string
  path: string
  params?: Params
  cols: Col[]
  createFields?: FieldDef[]
  createLabel?: string
  createTitle?: string
  /** Valores iniciais do formulário de criação. */
  createInitial?: Row
  createMethod?: 'post' | 'put'
  beforeCreate?: (p: Row) => Row
  /** Corre depois de criar com sucesso (ex.: despachar algo que o registo acabou de pôr em fila, enviar os ficheiros escolhidos). */
  afterCreate?: (r: Row, valores: Row) => void | Promise<void>
  editFields?: FieldDef[]
  editPath?: (r: Row) => string
  editMethod?: 'patch' | 'put'
  editLabel?: string
  /** Atalho: editar (PATCH) e apagar (DELETE) em `${crud}/${id}`; edita com os campos de criação se não houver editFields. */
  crud?: string
  /** Caminho do DELETE; a API recusa (409) apagar o que ainda está a ser usado. */
  deletePath?: (r: Row) => string
  /** Nome do registo na pergunta de confirmação. */
  deleteName?: (r: Row) => string
  invalidate?: string[]
  rowActions?: (r: Row) => ReactNode
  onRow?: (r: Row) => void
  /** Detalhe por baixo da linha ao clicar (ver Table). */
  expand?: (r: Row) => ReactNode
  toolbar?: ReactNode
  search?: boolean
  filter?: (r: Row) => boolean
  empty?: ReactNode
  pageSize?: number
  hint?: ReactNode
}

/** Lista + criação + edição de um recurso simples da API. */
export function Resource({
  title, path, params, cols, createFields, createLabel = 'Novo', createTitle, createInitial, createMethod = 'post', beforeCreate, afterCreate,
  editFields: editFieldsProp, editPath: editPathProp, editMethod = 'patch', editLabel = 'Editar', deletePath: deletePathProp, deleteName, crud, invalidate, rowActions, onRow, expand, toolbar, search, filter, empty, pageSize, hint,
}: Props) {
  const confirm = useConfirm()
  const editFields = editFieldsProp ?? (crud ? createFields : undefined)
  const editPath = editPathProp ?? (crud ? (r: Row) => `${crud}/${r.id}` : undefined)
  const deletePath = deletePathProp ?? (crud ? (r: Row) => `${crud}/${r.id}` : undefined)
  const q = useList(path, params)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [viewing, setViewing] = useState<Row | null>(null)
  const [term, setTerm] = useState('')
  const inv = invalidate ?? [path]

  const criar = useAct(
    async ({ p, v }: { p: Row; v: Row }) => {
      const r = await api[createMethod](path, beforeCreate ? beforeCreate(p) : p)
      await afterCreate?.(r, v)
      return r
    },
    { invalidate: inv, ok: 'Registo criado.' },
  )
  const editar = useAct((v: { r: Row; p: Row }) => api[editMethod](editPath!(v.r), v.p), { invalidate: inv, ok: 'Alterações guardadas.' })
  const apagar = useAct((r: Row) => api.del(deletePath!(r)), { invalidate: inv, ok: 'Registo apagado.' })
  const pedirApagar = async (r: Row) => {
    const nome = deleteName?.(r) ?? String(r.designacao ?? r.nome_completo ?? r.nome ?? `#${r.id}`)
    if (await confirm({ title: 'Apagar', text: `Apagar «${nome}»? Se ainda estiver a ser usado, o sistema não deixa.`, danger: true, yes: 'Apagar' })) apagar.mutate(r)
  }

  const rows = useMemo(() => {
    let l = q.rows
    if (filter) l = l.filter(filter)
    if (term) {
      const t = term.toLowerCase()
      l = l.filter((r) => JSON.stringify(Object.values(r)).toLowerCase().includes(t))
    }
    return l
  }, [q.rows, filter, term])

  // Acções de cada linha num menu "⋯": Visualizar, as acções próprias da lista, Editar e Apagar.
  const columns: Col[] = [...cols, {
    h: '',
    render: (r) => (
      <MenuAccoes>
        <Btn variant="link" onClick={() => setViewing(r)}>Visualizar</Btn>
        {rowActions?.(r)}
        {editFields && editPath && <Btn variant="link" onClick={() => setEditing(r)}>{editLabel}</Btn>}
        {deletePath && <Btn variant="link" className="perigo" onClick={() => pedirApagar(r)}>Apagar</Btn>}
      </MenuAccoes>
    ),
  }]

  return (
    <section style={{ marginBottom: 20 }}>
      {(title || createFields || toolbar || search) && (
        <div className="toolbar">
          {title && <h3 style={{ marginRight: 'auto' }}>{title}</h3>}
          {search && <SearchBox value={term} onChange={setTerm} placeholder="Filtrar…" />}
          {toolbar}
          {createFields && <Btn icon="mais" onClick={() => setCreating(true)}>{createLabel}</Btn>}
        </div>
      )}
      {hint && <p className="note" style={{ margin: '0 0 10px' }}>{hint}</p>}
      <Table rows={rows} cols={columns} loading={q.isLoading} error={q.error} onRetry={() => q.refetch()} onRow={onRow} expand={expand} empty={empty} pageSize={pageSize} />
      {creating && createFields && (
        <FormDialog
          title={createTitle ?? createLabel}
          fields={createFields}
          initial={createInitial}
          onClose={() => setCreating(false)}
          onSubmit={(p, v) => criar.mutateAsync({ p, v })}
        />
      )}
      {viewing && (
        <Modal title={String(viewing.designacao ?? viewing.nome_completo ?? viewing.nome ?? viewing.titulo ?? 'Detalhes')} onClose={() => setViewing(null)}
          footer={<>
            {editFields && editPath && <Btn variant="ghost" onClick={() => { setEditing(viewing); setViewing(null) }}>{editLabel}</Btn>}
            <Btn onClick={() => setViewing(null)}>Fechar</Btn>
          </>}>
          <dl className="detalhe">
            {cols.filter((c) => c.h).map((c, i) => (
              <div key={i}><dt>{c.h}</dt><dd>{cell(c, viewing, 0)}</dd></div>
            ))}
          </dl>
          {expand && <div style={{ marginTop: 12 }}>{expand(viewing)}</div>}
        </Modal>
      )}
      {editing && editFields && (
        <FormDialog
          title={editLabel}
          fields={editFields}
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={(p) => editar.mutateAsync({ r: editing, p })}
        />
      )}
    </section>
  )
}
