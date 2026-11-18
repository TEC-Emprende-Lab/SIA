'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { CalendarDays, Check, CornerDownLeft, Hash, Lightbulb, ListTodo, MoreHorizontal, RefreshCw, Send, Target, Wallet, X } from 'lucide-react'

import { useMe } from './authenticated-shell'
import shell from './expediente.module.css'
import styles from './comunicacion.module.css'
import { LoadMore } from './load-more'
import { ConfirmAction } from './ui/confirm-action'
import { LoadingRows, LoadingState, SkeletonBar } from './ui/loading-state'
import { formatDateTime } from '../lib/expediente'
import { usePagedList } from '../lib/use-paged-list'
import {
  channelUrl, channelsUrl, MESSAGE_PAGE_SIZE, parseChannelList, parseMessage, parseMessageList, parseReceipt, parseUnread,
  requestComunicacion, requiredText, type Channel, type Message,
  type MessageReferenceCreate,
} from '../lib/comunicacion'
import { parseActivityList, parseObjectiveList, requestSeguimiento, seguimientoUrl, type Activity, type Objective } from '../lib/seguimiento'

const fetchChannels = (url: string) => requestComunicacion(url, parseChannelList)
const standardKinds = ['gestion_proyecto', 'finanzas', 'reuniones'] as const

function field(data: FormData, name: string): string { const value = data.get(name); return typeof value === 'string' ? value : '' }
function ChannelIcon({ channel }: { channel: Channel }) {
  if (channel.kind === 'finanzas') return <Wallet aria-hidden="true" />
  if (channel.kind === 'reuniones') return <CalendarDays aria-hidden="true" />
  return channel.kind === 'gestion_proyecto' ? <Hash aria-hidden="true" /> : <Hash aria-hidden="true" />
}

/** US-COM-001: consult the fixed shared entrepreneurship channels. */
export function ChannelsPanel({ entrepreneurshipId, cycleId }: { entrepreneurshipId: string; cycleId?: string }) {
  return <ChannelsScope key={`${entrepreneurshipId}/${cycleId ?? ''}`} entrepreneurshipId={entrepreneurshipId} cycleId={cycleId} />
}

function ChannelsScope({ entrepreneurshipId, cycleId }: { entrepreneurshipId: string; cycleId?: string }) {
  const me = useMe()
  const channels = usePagedList((limit, offset) => channelsUrl({ entrepreneurshipId, limit, offset }), fetchChannels)
  const state = channels.state
  const [openId, setOpenId] = useState<string | null>(null)
  const headingId = `canales-${entrepreneurshipId}`
  const orderedChannels = useMemo(() => state.status === 'ready'
    ? [...state.data].sort((a, b) => {
      const aIndex = standardKinds.indexOf(a.kind as typeof standardKinds[number])
      const bIndex = standardKinds.indexOf(b.kind as typeof standardKinds[number])
      return (aIndex < 0 ? 99 : aIndex) - (bIndex < 0 ? 99 : bIndex)
    }) : [], [state])
  const firstChannel = orderedChannels[0]
  const selectedChannel = orderedChannels.find((item) => item.id === openId) ?? firstChannel

  let unavailable = null
  if (state.status === 'forbidden') {
    let guidance = 'Si esperabas tener acceso, vuelve a consultar los canales. Si el problema continúa, avisa al equipo de soporte de SIA.'
    if (me.role === 'Gestor' || me.role === 'Emprendedor') {
      guidance = 'Los canales compartidos requieren una asignación al emprendimiento. Si solo tienes acceso al ciclo, pide a la Coordinadora que revise tu asignación.'
    }
    unavailable = (
      <div className={shell.section}>
        <div role="alert">
          <h3>Chat compartido no disponible</h3>
          <p className={shell.meta}>{guidance}</p>
        </div>
        <button type="button" className={shell.buttonSecondary} onClick={channels.reload}>Volver a consultar</button>
      </div>
    )
  } else if (state.status === 'missing' || state.status === 'error') {
    unavailable = (
      <>
        <p className={shell.formError} role="alert">{state.message}</p>
        {state.status === 'error' && <button type="button" className={shell.buttonSecondary} onClick={channels.reload}>Reintentar</button>}
      </>
    )
  }

  return <section className={styles.chatSection} aria-labelledby={headingId}>
    <header className={styles.chatIntro}>
      <div><h2 id={headingId}>Conversaciones</h2><p>Canales compartidos entre los ciclos del emprendimiento.</p></div>
      <p className={styles.syncNote}><RefreshCw aria-hidden="true" /> Se actualiza al abrir un canal</p>
    </header>
    {state.status === 'loading' && <ChannelsLoading />}
    {unavailable}
    {state.status === 'ready' && orderedChannels.length === 0 && <div>
      <ChatStatus message="No hay canales disponibles para este emprendimiento. Vuelve a consultarlos para comprobar si ya aparecen." />
      <button type="button" className={shell.buttonSecondary} onClick={channels.reload}>Volver a consultar</button>
    </div>}
    {state.status === 'ready' && selectedChannel && <div className={styles.chatLayout}>
      <nav className={styles.channelRail} aria-label="Canales del emprendimiento">
        <div className={styles.channelRailHeader}><span>Canales</span><span>{orderedChannels.length}</span></div>
        <div className={styles.channelList}>
          {orderedChannels.map((channel) => <ChannelNav key={channel.id} channel={channel} selected={selectedChannel.id === channel.id} onSelect={() => setOpenId(channel.id)} />)}
        </div>
        {channels.hasMore ? <LoadMore hasMore={channels.hasMore} loading={channels.loadingMore} error={channels.moreError} onLoad={() => void channels.loadMore()} label="Ver más canales" /> : null}
      </nav>
      <ChannelThread key={selectedChannel.id} channel={selectedChannel} userId={me.id} cycleId={cycleId} />
    </div>}
  </section>
}

function ChatStatus({ message }: { message: string }) { return <div className={styles.chatStatus}><Hash aria-hidden="true" /><p>{message}</p></div> }

function ChannelsLoading() {
  return <LoadingState label="Cargando conversaciones…">
    <div className={styles.chatLayout}>
      <div className={styles.channelRail}>
        <div className={styles.channelRailHeader}><SkeletonBar size="short" /></div>
        <div className={`${styles.channelList} ${styles.loadingChannels}`}>
          {standardKinds.map((kind) => <div className={styles.channelNav} key={kind}>
            <SkeletonBar size="short" /><SkeletonBar />
          </div>)}
        </div>
      </div>
      <div className={styles.thread}>
        <div className={styles.threadHeader}>
          <div className={styles.loadingThreadTitle}><SkeletonBar /><SkeletonBar size="text" /></div>
        </div>
        <div className={styles.messageArea}><MessageSkeletons /></div>
      </div>
    </div>
  </LoadingState>
}

function MessageSkeletons() {
  return <div className={styles.messageList}>
    {[false, true, false].map((own, index) => <div className={`${styles.message} ${styles.loadingMessage}`} data-own={own} key={index}>
      <SkeletonBar size="short" />
      <div className={styles.loadingMessageBody}><SkeletonBar /><SkeletonBar size="text" /></div>
    </div>)}
  </div>
}

function ChannelNav({ channel, selected, onSelect }: { channel: Channel; selected: boolean; onSelect: () => void }) {
  const [unread, setUnread] = useState<number | null>(null)
  useEffect(() => { let active = true; void requestComunicacion(channelUrl(channel.id, 'unread'), parseUnread).then((result) => { if (active && result.ok) setUnread(result.data) }); return () => { active = false } }, [channel.id])
  return <button type="button" className={styles.channelNav} data-active={selected} onClick={onSelect} aria-current={selected ? 'page' : undefined}>
    <ChannelIcon channel={channel} /><span className={styles.channelName}>{channel.name}</span>
    {unread ? <span className={styles.unreadCount} aria-label={`${unread} mensajes sin leer`}>{unread > 99 ? '99+' : unread}</span> : null}
  </button>
}

type ThreadState = { status: 'loading' } | { status: 'ready'; messages: Message[]; offset: number; complete: boolean } | { status: 'error'; message: string }
type ActionError = { id: string; message: string } | null

function ChannelThread({ channel, userId, cycleId }: { channel: Channel; userId: string; cycleId?: string }) {
  const [state, setState] = useState<ThreadState>({ status: 'loading' })
  const [reading, setReading] = useState(false)
  const [readError, setReadError] = useState('')
  const [notice, setNotice] = useState('')
  const threadHeading = useRef<HTMLHeadingElement>(null)
  const epoch = useRef(0)
  const locked = useRef(false)
  const abortRead = useRef<AbortController | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null); const [actionError, setActionError] = useState<ActionError>(null)
  const [content, setContent] = useState(''); const [references, setReferences] = useState<MessageReferenceCreate[]>([]); const [picker, setPicker] = useState<'objective' | 'activity' | null>(null)
  const writable = channel.revoked_at === null

  async function read(offset: number, count: number, previous?: Message[]) {
    if (locked.current) return
    locked.current = true
    const requestEpoch = epoch.current
    const controller = new AbortController()
    abortRead.current = controller
    setReading(true)
    setReadError('')
    let pageOffset = offset
    let complete = false
    const messages = new Map((previous ?? []).map((message) => [message.id, message]))
    let last: Message | undefined
    try {
      while (pageOffset < offset + count && !complete) {
        const limit = Math.min(MESSAGE_PAGE_SIZE, offset + count - pageOffset)
        const result = await requestComunicacion(channelUrl(channel.id, 'messages', { limit, offset: pageOffset }), parseMessageList, { signal: controller.signal })
        if (epoch.current !== requestEpoch) return
        if (!result.ok) {
          if (result.status === 403 || result.status === 404 || state.status !== 'ready') {
            setState({ status: 'error', message: result.message })
          } else {
            setReadError(`No se pudieron consultar los mensajes. ${result.message} Los mensajes ya cargados siguen visibles.`)
          }
          return
        }
        if (result.data.length === limit && result.data.every((message) => messages.has(message.id))) {
          const message = 'La consulta devolvió una página repetida. Actualiza los mensajes antes de continuar.'
          if (state.status === 'ready') setReadError(message)
          else setState({ status: 'error', message })
          return
        }
        result.data.forEach((message) => messages.set(message.id, message))
        last = result.data.at(-1) ?? last
        pageOffset += result.data.length
        complete = result.data.length < limit
      }
      setState({ status: 'ready', messages: [...messages.values()], offset: pageOffset, complete })
      if (last) void requestComunicacion(channelUrl(channel.id, 'read-receipt'), parseReceipt, {
        method: 'PUT', body: { last_read_message_id: last.id },
      })
    } finally {
      if (epoch.current === requestEpoch) {
        locked.current = false
        abortRead.current = null
        setReading(false)
      }
    }
  }

  useEffect(() => {
    void read(0, MESSAGE_PAGE_SIZE)
    return () => {
      epoch.current += 1
      abortRead.current?.abort()
      locked.current = false
    }
    // The keyed thread owns all requests for one channel and cycle.
  }, [channel.id])

  function refresh() {
    let count = MESSAGE_PAGE_SIZE
    if (state.status === 'ready') {
      count = Math.max(state.offset, MESSAGE_PAGE_SIZE)
      if (state.complete) count = Math.max(state.offset + MESSAGE_PAGE_SIZE, count)
    }
    void read(0, count)
  }

  async function run(id: string, success: string, exec: () => ReturnType<typeof requestComunicacion<Message>>) {
    if (locked.current) return null
    locked.current = true
    const requestEpoch = epoch.current
    setPendingId(id)
    setActionError(null)
    setNotice('')
    const result = await exec()
    if (epoch.current !== requestEpoch) return null
    locked.current = false
    setPendingId(null)
    if (!result.ok) {
      setActionError({ id, message: result.message })
      return null
    }
    setNotice(success)
    return result.data
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (locked.current) return
    const text = requiredText(content, 'Escribe un mensaje.')
    if ('error' in text) {
      setActionError({ id: 'send', message: text.error })
      return
    }
    const sent = await run('send', 'Mensaje enviado.', () => requestComunicacion(channelUrl(channel.id, 'messages'), parseMessage, {
      method: 'POST', body: { content: text.text, mentioned_user_ids: [], references },
    }))
    if (!sent) return
    setContent('')
    setReferences([])
    setPicker(null)
    if (state.status === 'ready' && state.complete) {
      void read(state.offset, MESSAGE_PAGE_SIZE, state.messages)
    } else {
      setNotice('Mensaje enviado. Sigue cargando mensajes para llegar al final de la conversación.')
    }
  }

  async function change(message: Message, action: 'edit' | 'revoke', observation: string, content?: string) {
    const url = channelUrl(channel.id, `messages/${message.id}`)
    const revision = { expected_revision: message.revision, observation }
    let changed: Message | null
    if (action === 'revoke') {
      changed = await run(`revoke-${message.id}`, 'Mensaje revocado. El historial conserva un marcador.', () =>
        requestComunicacion(url, parseMessage, { method: 'DELETE', body: revision }))
    } else {
      changed = await run(`edit-${message.id}`, 'Cambios del mensaje guardados.', () =>
        requestComunicacion(url, parseMessage, { method: 'PUT', body: { ...revision, content } }))
    }
    if (!changed) return
    setState((current) => {
      if (current.status !== 'ready') return current
      return { ...current, messages: current.messages.map((item) => {
        if (item.id === changed.id) return changed
        return item
      }) }
    })
    if (action === 'edit') threadHeading.current?.focus()
  }

  let scopeLabel = 'Canal compartido del emprendimiento'
  if (!writable) scopeLabel = 'Canal revocado'
  let emptyLabel = 'Escribe el primer mensaje para iniciar la conversación.'
  if (!writable) emptyLabel = 'No quedaron mensajes en este canal.'
  let sendLabel = 'Enviar'
  if (pendingId === 'send') sendLabel = 'Enviando…'
  const busy = reading || pendingId !== null
  function draftChanged(next: string) {
    const command = next.match(/\/(objetivos|actividades)$/)
    if (command && cycleId) {
      if (command[1] === 'objetivos') setPicker('objective')
      else setPicker('activity')
      setContent(next.slice(0, -command[0].length))
    } else {
      setContent(next)
    }
  }
  return <article className={styles.thread} aria-label={`Conversación: ${channel.name}`}>
    <header className={styles.threadHeader}>
      <div className={styles.threadTitle}><ChannelIcon channel={channel} /><div><h3 ref={threadHeading} tabIndex={-1}>{channel.name}</h3><p>{scopeLabel}</p></div></div>
      <button type="button" className={styles.iconButton} aria-disabled={busy} onClick={refresh} aria-label="Actualizar mensajes"><RefreshCw aria-hidden="true" /></button>
    </header>
    <div className={styles.messageArea}>
      {state.status === 'loading' && <LoadingState label="Cargando mensajes…"><MessageSkeletons /></LoadingState>}
      {state.status === 'error' && <div>
        <p className={shell.formError} role="alert">{state.message}</p>
        <button type="button" className={styles.loadMessages} aria-disabled={busy} onClick={refresh}>Reintentar consulta</button>
      </div>}
      {state.status === 'ready' && <>
        {state.messages.length === 0 && <ChatStatus message={emptyLabel} />}
        {state.messages.length > 0 && <ol className={styles.messageList}>{state.messages.map((message) =>
          <MessageItem key={`${message.id}:${message.revision}`} message={message} channelName={channel.name}
            own={message.created_by === userId} writable={writable} pendingId={pendingId} busy={busy} actionError={actionError}
            focusThread={() => threadHeading.current?.focus()}
            onEdit={(content, observation) => void change(message, 'edit', observation, content)}
            onRevoke={(observation) => void change(message, 'revoke', observation)} />
        )}</ol>}
        {!state.complete && <button type="button" className={styles.loadMessages} aria-disabled={busy}
          onClick={() => void read(state.offset, MESSAGE_PAGE_SIZE, state.messages)}>Cargar más mensajes</button>}
        {readError && <p className={shell.formError} role="alert">{readError}</p>}
      </>}
      <p role="status" className={styles.inlineStatus}>{reading && state.status !== 'loading' && 'Consultando mensajes…'}</p>
    </div>
    {writable && state.status === 'ready' && <form className={styles.composer} onSubmit={(event) => void send(event)}>
      <label className={styles.visuallyHidden} htmlFor={`message-${channel.id}`}>Mensaje</label>
      <textarea id={`message-${channel.id}`} name="content" required maxLength={20000} value={content} readOnly={pendingId === 'send'} placeholder={`Escribe en #${channel.name}`} onChange={(event) => draftChanged(event.target.value)} />
      {references.length > 0 && <div className={styles.referenceDrafts}>{references.map((reference) =>
        <span key={`${reference.kind}-${reference.target_id}`}><ReferenceIcon kind={reference.kind} />{referenceLabel(reference.kind)}
          <button type="button" disabled={pendingId === 'send'} aria-label="Quitar referencia" onClick={() => setReferences((items) => items.filter((item) => item.target_id !== reference.target_id || item.kind !== reference.kind))}><X aria-hidden="true" /></button>
        </span>
      )}</div>}
      {cycleId && <div className={styles.referenceTools}>
        <div className={styles.referenceHint}><span className={styles.referenceHintIcon}><Lightbulb aria-hidden="true" /></span><span><strong>Referencias del ciclo</strong><small>Vincula un objetivo o una actividad del plan.</small></span></div>
        <div className={styles.referenceActions}>
          <button type="button" disabled={pendingId === 'send'} onClick={() => setPicker('objective')}><Target aria-hidden="true" />Objetivo</button>
          <button type="button" disabled={pendingId === 'send'} onClick={() => setPicker('activity')}><ListTodo aria-hidden="true" />Actividad</button>
          <span className={styles.shortcutHint}><CornerDownLeft aria-hidden="true" /> Escribe <kbd>/objetivos</kbd> o <kbd>/actividades</kbd></span>
        </div>
      </div>}
      {picker && cycleId && pendingId !== 'send' && <ReferencePicker key={picker} cycleId={cycleId} kind={picker} selected={references} onClose={() => setPicker(null)} onPick={(reference) => {
        setReferences((items) => {
          if (items.some((item) => item.kind === reference.kind && item.target_id === reference.target_id)) return items
          return [...items, reference]
        })
        setPicker(null)
      }} />}
      <div className={styles.composerFooter}><span>Los mensajes se guardan en el historial del canal.</span><button type="submit" aria-disabled={busy}>{sendLabel} <Send aria-hidden="true" /></button></div>
      <ErrorLine id="send" error={actionError} />
    </form>}
    {!writable && <p className={styles.revokedNotice}>Este canal fue revocado y no admite mensajes nuevos.</p>}
    <p role="status" className={styles.inlineStatus}>{notice}</p>
  </article>
}

function ErrorLine({ id, error }: { id: string; error: ActionError }) {
  if (error?.id !== id) return null
  return <p className={shell.formError} role="alert">{error.message}</p>
}
function referenceLabel(kind: MessageReferenceCreate['kind']) {
  if (kind === 'objective') return 'Objetivo'
  return 'Actividad'
}
function ReferenceIcon({ kind }: { kind: 'objective' | 'activity' }) { return kind === 'objective' ? <Target aria-hidden="true" /> : <ListTodo aria-hidden="true" /> }
function ReferencePicker({ cycleId, kind, selected, onPick, onClose }: { cycleId: string; kind: 'objective' | 'activity'; selected: MessageReferenceCreate[]; onPick: (reference: MessageReferenceCreate) => void; onClose: () => void }) {
  const [attempt, setAttempt] = useState(0)
  const [items, setItems] = useState<(Objective | Activity)[]>([]); const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading'); const [query, setQuery] = useState('')
  useEffect(() => {
    let active = true
    async function load() {
      setStatus('loading')
      let result
      if (kind === 'objective') {
        result = await requestSeguimiento(seguimientoUrl(cycleId, 'objectives'), parseObjectiveList)
      } else {
        result = await requestSeguimiento(seguimientoUrl(cycleId, 'activities'), parseActivityList)
      }
      if (!active) return
      if (!result.ok) {
        setStatus('error')
        return
      }
      setItems(result.data)
      setStatus('ready')
    }
    void load()
    return () => { active = false }
  }, [cycleId, kind, attempt])
  const visible = items.filter((item) => item.title.toLocaleLowerCase('es-CR').includes(query.toLocaleLowerCase('es-CR')))
  let targetLabel = 'actividad'
  let loadingLabel = 'Cargando actividades…'
  let emptyLabel = 'Este ciclo todavía no tiene actividades para referenciar.'
  if (kind === 'objective') {
    targetLabel = 'objetivo'
    loadingLabel = 'Cargando objetivos…'
    emptyLabel = 'Este ciclo todavía no tiene objetivos para referenciar.'
  }
  return <div className={styles.referencePicker} role="dialog" aria-label={`Referenciar ${targetLabel}`}>
    <div><strong>Referenciar {targetLabel}</strong><button type="button" onClick={onClose} aria-label="Cerrar selector"><X aria-hidden="true" /></button></div>
    <input autoFocus type="search" aria-label={`Buscar ${targetLabel}`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar…" />
    {status === 'loading' && <div className={styles.referenceLoading}><LoadingRows label={loadingLabel} rows={2} /></div>}
    {status === 'error' && <>
      <p role="alert">No se pudo cargar el plan del ciclo.</p>
      <button type="button" className={styles.loadMessages} onClick={() => setAttempt((value) => value + 1)}>Reintentar</button>
    </>}
    {status === 'ready' && <ul>
      {visible.map((item) => {
        const alreadySelected = selected.some((reference) => reference.kind === kind && reference.target_id === item.id)
        return <li key={item.id}><button type="button" onClick={() => onPick({ cycle_id: cycleId, kind, target_id: item.id })} disabled={alreadySelected}><ReferenceIcon kind={kind} /><span>{item.title}</span>{alreadySelected && <Check aria-label="Ya referenciado" />}</button></li>
      })}
      {items.length === 0 && <li>{emptyLabel}</li>}
      {items.length > 0 && visible.length === 0 && <li>No hay coincidencias. <button type="button" onClick={() => setQuery('')}>Limpiar búsqueda</button></li>}
    </ul>}
  </div>
}
function MessageItem({ message, channelName, own, writable, pendingId, busy, actionError, focusThread, onEdit, onRevoke }: {
  message: Message; channelName: string; own: boolean; writable: boolean; pendingId: string | null; busy: boolean
  actionError: ActionError; focusThread: () => void
  onEdit: (content: string, observation: string) => void; onRevoke: (observation: string) => void
}) {
  const [localError, setLocalError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const revokeTrigger = useRef<HTMLButtonElement>(null)
  const editTrigger = useRef<HTMLButtonElement>(null)
  const revoked = message.revoked_at !== null
  const editId = `edit-${message.id}`
  const revokeId = `revoke-${message.id}`

  function edit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const data = new FormData(event.currentTarget)
    const text = requiredText(field(data, 'content'), 'Escribe un mensaje.')
    const observation = requiredText(field(data, 'observation'), 'La observación es obligatoria.')
    if ('error' in text) {
      setLocalError(text.error)
      return
    }
    if ('error' in observation) {
      setLocalError(observation.error)
      return
    }
    setLocalError(null)
    onEdit(text.text, observation.text)
  }

  let participant = 'Participante'
  let initial = 'P'
  if (own) {
    participant = 'Tú'
    initial = 'T'
  }
  let body = message.content
  if (revoked) body = 'Mensaje revocado.'
  let revokeError: string | undefined
  if (actionError?.id === revokeId) revokeError = actionError.message
  let editLabel = 'Guardar cambios'
  if (pendingId === editId) editLabel = 'Guardando…'

  return <li className={styles.message} data-own={own} data-revoked={revoked}>
    <div className={styles.avatar} aria-hidden="true">{initial}</div>
    <div className={styles.messageBody}>
      <div className={styles.messageMeta}><strong>{participant}</strong><time dateTime={message.created_at}>{formatDateTime(message.created_at)}</time>{message.revision > 1 && !revoked && <span>editado</span>}</div>
      <p>{body}</p>
      {!revoked && message.references.length > 0 && <div className={styles.messageReferences}>{message.references.map((reference) => <span key={reference.id}><ReferenceIcon kind={reference.kind} />{reference.target_title}</span>)}</div>}
      {own && writable && !revoked && <details className={styles.messageActions}>
        <summary aria-label="Acciones del mensaje"><MoreHorizontal aria-hidden="true" /></summary>
        <div>
          <div className={styles.messageChoices}>
            <button ref={editTrigger} type="button" aria-expanded={editing} disabled={busy} onClick={() => {
              setLocalError(null)
              setEditing((open) => !open)
            }}>Editar mensaje</button>
            <button ref={revokeTrigger} type="button" aria-haspopup="dialog" disabled={busy} onClick={() => setConfirming(true)}>Revocar mensaje</button>
          </div>
          {editing && <form onSubmit={edit}>
            <label>Editar mensaje<textarea name="content" required maxLength={20000} readOnly={busy} defaultValue={message.content ?? ''} /></label>
            <label>Observación del cambio<textarea name="observation" required readOnly={busy} /></label>
            {localError && <p className={shell.formError} role="alert">{localError}</p>}
            <ErrorLine id={editId} error={actionError} />
            <div className={styles.messageChoices}>
              <button type="button" disabled={busy} onClick={() => {
                setEditing(false)
                setLocalError(null)
                editTrigger.current?.focus()
              }}>Cancelar edición</button>
              <button type="submit" disabled={busy}>{editLabel}</button>
            </div>
          </form>}
        </div>
      </details>}
      {confirming && <ConfirmAction title="Revocar mensaje"
        subject={`Mensaje en ${channelName} del ${formatDateTime(message.created_at)}`}
        description="El texto y las referencias dejarán de verse en el canal. Quedará un marcador en la conversación y el cambio se conservará en el historial de auditoría."
        tone="danger" requireObservation confirmLabel="Confirmar revocación" pendingLabel="Revocando mensaje…"
        pending={pendingId === revokeId} error={revokeError} onCancel={() => setConfirming(false)} onConfirm={onRevoke}
        restoreFocus={() => {
          if (revokeTrigger.current?.isConnected) revokeTrigger.current.focus()
          else focusThread()
        }} />}
    </div>
  </li>
}
