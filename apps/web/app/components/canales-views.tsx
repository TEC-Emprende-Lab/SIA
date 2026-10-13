'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CalendarDays, Check, Hash, ListTodo, MoreHorizontal, RefreshCw, Send, Target, Wallet, X } from 'lucide-react'

import { useMe } from './authenticated-shell'
import shell from './expediente.module.css'
import styles from './comunicacion.module.css'
import { LoadMore } from './load-more'
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

  useEffect(() => {
    if (!openId && firstChannel) setOpenId(firstChannel.id)
  }, [openId, firstChannel])

  return <section className={styles.chatSection} aria-labelledby={headingId}>
    <header className={styles.chatIntro}>
      <div><p className={styles.kicker}>ESPACIO DEL EQUIPO</p><h2 id={headingId}>Conversaciones</h2><p>Mensajes organizados para que el equipo avance con contexto.</p></div>
      <p className={styles.syncNote}><RefreshCw aria-hidden="true" /> Se actualiza al abrir un canal</p>
    </header>
    {state.status === 'loading' ? <ChatStatus message="Cargando conversaciones…" /> : null}
    {state.status === 'forbidden' || state.status === 'missing' || state.status === 'error' ? <>
      <p className={shell.formError} role="alert">{state.message}</p>
      {state.status === 'error' ? <button type="button" className={shell.buttonSecondary} onClick={channels.reload}>Reintentar</button> : null}
    </> : null}
    {state.status === 'ready' && orderedChannels.length === 0 ? <ChatStatus message="Todavía no hay canales disponibles." /> : null}
    {state.status === 'ready' && orderedChannels.length > 0 ? <div className={styles.chatLayout}>
      <nav className={styles.channelRail} aria-label="Canales del emprendimiento">
        <div className={styles.channelRailHeader}><span>Canales</span><span>{orderedChannels.length}</span></div>
        <div className={styles.channelList}>
          {orderedChannels.map((channel) => <ChannelNav key={channel.id} channel={channel} selected={openId === channel.id} onSelect={() => setOpenId(channel.id)} />)}
        </div>
        {channels.hasMore ? <LoadMore hasMore={channels.hasMore} loading={channels.loadingMore} error={channels.moreError} onLoad={() => void channels.loadMore()} label="Ver más canales" /> : null}
      </nav>
      {openId && firstChannel ? <ChannelThread channel={orderedChannels.find((channel) => channel.id === openId) ?? firstChannel} userId={me.id} cycleId={cycleId} /> : null}
    </div> : null}
  </section>
}

function ChatStatus({ message }: { message: string }) { return <div className={styles.chatStatus}><Hash aria-hidden="true" /><p>{message}</p></div> }

function ChannelNav({ channel, selected, onSelect }: { channel: Channel; selected: boolean; onSelect: () => void }) {
  const [unread, setUnread] = useState<number | null>(null)
  useEffect(() => { let active = true; void requestComunicacion(channelUrl(channel.id, 'unread'), parseUnread).then((result) => { if (active && result.ok) setUnread(result.data) }); return () => { active = false } }, [channel.id])
  return <button type="button" className={styles.channelNav} data-active={selected} onClick={onSelect} aria-current={selected ? 'page' : undefined}>
    <ChannelIcon channel={channel} /><span className={styles.channelName}>{channel.name}</span>
    {unread ? <span className={styles.unreadCount} aria-label={`${unread} mensajes sin leer`}>{unread > 99 ? '99+' : unread}</span> : null}
  </button>
}

type ThreadState = { status: 'loading' } | { status: 'ready'; messages: Message[]; complete: boolean } | { status: 'error'; message: string }
type ActionError = { id: string; message: string } | null

function ChannelThread({ channel, userId, cycleId }: { channel: Channel; userId: string; cycleId?: string }) {
  const [attempt, setAttempt] = useState(0); const [pages, setPages] = useState(1); const [state, setState] = useState<ThreadState>({ status: 'loading' })
  const [pendingId, setPendingId] = useState<string | null>(null); const [actionError, setActionError] = useState<ActionError>(null); const [formKey, setFormKey] = useState(0)
  const [content, setContent] = useState(''); const [references, setReferences] = useState<MessageReferenceCreate[]>([]); const [picker, setPicker] = useState<'objective' | 'activity' | null>(null)
  const writable = channel.revoked_at === null
  useEffect(() => { setPages(1) }, [channel.id])
  useEffect(() => { let cancelled = false; async function load() {
    setState({ status: 'loading' }); const result = await requestComunicacion(channelUrl(channel.id, 'messages', { limit: Math.min(MESSAGE_PAGE_SIZE * pages, 100), offset: 0 }), parseMessageList)
    if (cancelled) return; if (!result.ok) { setState({ status: 'error', message: result.message }); return }
    const messages = result.data; setState({ status: 'ready', messages, complete: messages.length < Math.min(MESSAGE_PAGE_SIZE * pages, 100) })
    const last = messages.at(-1); if (last) { const receipt = await requestComunicacion(channelUrl(channel.id, 'read-receipt'), parseReceipt, { method: 'PUT', body: { last_read_message_id: last.id } }); if (!cancelled && receipt.ok) return }
  }; void load(); return () => { cancelled = true } }, [channel.id, pages, attempt])
  async function run(id: string, exec: () => Promise<{ ok: boolean; message?: string }>) { if (pendingId) return false; setPendingId(id); setActionError(null); const result = await exec(); setPendingId(null); if (!result.ok) { setActionError({ id, message: result.message ?? 'No se pudo guardar.' }); return false }; setAttempt((value) => value + 1); return true }
  async function send(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const text = requiredText(content, 'Escribe un mensaje.'); if ('error' in text) { setActionError({ id: 'send', message: text.error }); return }; if (await run('send', () => requestComunicacion(channelUrl(channel.id, 'messages'), parseMessage, { method: 'POST', body: { content: text.text, mentioned_user_ids: [], references } }))) { setFormKey((value) => value + 1); setContent(''); setReferences([]) } }
  return <article className={styles.thread} aria-label={`Conversación: ${channel.name}`}>
    <header className={styles.threadHeader}><div className={styles.threadTitle}><ChannelIcon channel={channel} /><div><h3>{channel.name}</h3><p>{channel.revoked_at ? 'Canal revocado' : 'Canal compartido del emprendimiento'}</p></div></div><button type="button" className={styles.iconButton} onClick={() => setAttempt((value) => value + 1)} aria-label="Actualizar mensajes"><RefreshCw aria-hidden="true" /></button></header>
    <div className={styles.messageArea} aria-live="polite">
      {state.status === 'loading' ? <ChatStatus message="Cargando mensajes…" /> : null}
      {state.status === 'error' ? <p className={shell.formError} role="alert">{state.message}</p> : null}
      {state.status === 'ready' && state.messages.length === 0 ? <ChatStatus message="Este canal está listo. Sé la primera persona en iniciar la conversación." /> : null}
      {state.status === 'ready' ? <ol className={styles.messageList}>{state.messages.map((message) => <MessageItem key={`${message.id}:${message.revision}`} message={message} own={message.created_by === userId} writable={writable} pendingId={pendingId} actionError={actionError} onEdit={(content, observation) => void run(`edit-${message.id}`, () => requestComunicacion(channelUrl(channel.id, `messages/${message.id}`), parseMessage, { method: 'PUT', body: { content, expected_revision: message.revision, observation } }))} onRevoke={(observation) => void run(`revoke-${message.id}`, () => requestComunicacion(channelUrl(channel.id, `messages/${message.id}`), parseMessage, { method: 'DELETE', body: { expected_revision: message.revision, observation } }))} />)}</ol> : null}
      {state.status === 'ready' && !state.complete ? <button type="button" className={styles.loadMessages} onClick={() => setPages((value) => value + 1)}>Cargar mensajes anteriores</button> : null}
    </div>
    {writable ? <form key={formKey} className={styles.composer} onSubmit={(event) => void send(event)}><label className={styles.visuallyHidden} htmlFor={`message-${channel.id}`}>Mensaje</label><textarea id={`message-${channel.id}`} name="content" required maxLength={20000} value={content} disabled={pendingId === 'send'} placeholder={`Escribe en #${channel.name}`} onChange={(event) => { const next = event.target.value; const command = next.match(/\/(objetivos|actividades)$/); if (command && cycleId) { setPicker(command[1] === 'objetivos' ? 'objective' : 'activity'); setContent(next.slice(0, -command[0].length)); return }; setContent(next) }} />{references.length ? <div className={styles.referenceDrafts}>{references.map((reference) => <span key={`${reference.kind}-${reference.target_id}`}><ReferenceIcon kind={reference.kind} />{reference.kind === 'objective' ? 'Objetivo' : 'Actividad'}<button type="button" aria-label="Quitar referencia" onClick={() => setReferences((items) => items.filter((item) => item.target_id !== reference.target_id || item.kind !== reference.kind))}><X aria-hidden="true" /></button></span>)}</div> : null}{cycleId ? <div className={styles.referenceActions}><button type="button" onClick={() => setPicker('objective')}><Target aria-hidden="true" />Objetivo</button><button type="button" onClick={() => setPicker('activity')}><ListTodo aria-hidden="true" />Actividad</button><small>También usa /objetivos o /actividades.</small></div> : null}{picker && cycleId ? <ReferencePicker cycleId={cycleId} kind={picker} selected={references} onClose={() => setPicker(null)} onPick={(reference) => { setReferences((items) => items.some((item) => item.kind === reference.kind && item.target_id === reference.target_id) ? items : [...items, reference]); setPicker(null) }} /> : null}<div className={styles.composerFooter}><span>Los mensajes se guardan en el historial del canal.</span><button type="submit" disabled={pendingId === 'send'}>{pendingId === 'send' ? 'Enviando…' : 'Enviar'} <Send aria-hidden="true" /></button></div><ErrorLine id="send" error={actionError} /></form> : <p className={styles.revokedNotice}>Este canal fue revocado y no admite mensajes nuevos.</p>}
  </article>
}

function ErrorLine({ id, error }: { id: string; error: ActionError }) { return error?.id === id ? <p className={shell.formError} role="alert">{error.message}</p> : null }
function ReferenceIcon({ kind }: { kind: 'objective' | 'activity' }) { return kind === 'objective' ? <Target aria-hidden="true" /> : <ListTodo aria-hidden="true" /> }
function ReferencePicker({ cycleId, kind, selected, onPick, onClose }: { cycleId: string; kind: 'objective' | 'activity'; selected: MessageReferenceCreate[]; onPick: (reference: MessageReferenceCreate) => void; onClose: () => void }) {
  const [items, setItems] = useState<(Objective | Activity)[]>([]); const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading'); const [query, setQuery] = useState('')
  useEffect(() => { let active = true; async function load() { if (kind === 'objective') { const result = await requestSeguimiento(seguimientoUrl(cycleId, 'objectives'), parseObjectiveList); if (active) { if (result.ok) { setItems(result.data); setStatus('ready') } else setStatus('error') }; return }; const result = await requestSeguimiento(seguimientoUrl(cycleId, 'activities'), parseActivityList); if (active) { if (result.ok) { setItems(result.data); setStatus('ready') } else setStatus('error') } }; void load(); return () => { active = false } }, [cycleId, kind])
  const visible = items.filter((item) => item.title.toLocaleLowerCase('es-CR').includes(query.toLocaleLowerCase('es-CR')))
  return <div className={styles.referencePicker} role="dialog" aria-label={`Referenciar ${kind === 'objective' ? 'objetivo' : 'actividad'}`}><div><strong>Referenciar {kind === 'objective' ? 'objetivo' : 'actividad'}</strong><button type="button" onClick={onClose} aria-label="Cerrar selector"><X aria-hidden="true" /></button></div><input autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar…" />{status === 'loading' ? <p>Cargando…</p> : null}{status === 'error' ? <p>No se pudo cargar el plan del ciclo.</p> : null}{status === 'ready' ? <ul>{visible.map((item) => <li key={item.id}><button type="button" onClick={() => onPick({ cycle_id: cycleId, kind, target_id: item.id })} disabled={selected.some((reference) => reference.kind === kind && reference.target_id === item.id)}><ReferenceIcon kind={kind} /><span>{item.title}</span>{selected.some((reference) => reference.kind === kind && reference.target_id === item.id) ? <Check aria-label="Ya referenciado" /> : null}</button></li>)}{visible.length === 0 ? <li>No hay coincidencias.</li> : null}</ul> : null}</div>
}
function MessageItem({ message, own, writable, pendingId, actionError, onEdit, onRevoke }: { message: Message; own: boolean; writable: boolean; pendingId: string | null; actionError: ActionError; onEdit: (content: string, observation: string) => void; onRevoke: (observation: string) => void }) {
  const [localError, setLocalError] = useState<string | null>(null); const revoked = message.revoked_at !== null
  function edit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const content = requiredText(field(data, 'content'), 'Escribe un mensaje.'); const observation = requiredText(field(data, 'observation'), 'La observación es obligatoria.'); if ('error' in content) { setLocalError(content.error); return }; if ('error' in observation) { setLocalError(observation.error); return }; setLocalError(null); onEdit(content.text, observation.text) }
  function revoke(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const observation = requiredText(field(new FormData(event.currentTarget), 'observation'), 'La observación es obligatoria.'); if ('error' in observation) { setLocalError(observation.error); return }; setLocalError(null); onRevoke(observation.text) }
  return <li className={styles.message} data-own={own} data-revoked={revoked}><div className={styles.avatar} aria-hidden="true">{own ? 'T' : 'P'}</div><div className={styles.messageBody}><div className={styles.messageMeta}><strong>{own ? 'Tú' : 'Participante'}</strong><time dateTime={message.created_at}>{formatDateTime(message.created_at)}</time>{message.revision > 1 && !revoked ? <span>editado</span> : null}</div><p>{revoked ? 'Mensaje revocado.' : message.content}</p>{!revoked && message.references.length ? <div className={styles.messageReferences}>{message.references.map((reference) => <span key={reference.id}><ReferenceIcon kind={reference.kind} />{reference.target_title}</span>)}</div> : null}{own && writable && !revoked ? <details className={styles.messageActions}><summary aria-label="Acciones del mensaje"><MoreHorizontal aria-hidden="true" /></summary><div><form onSubmit={edit}><label>Editar mensaje<textarea name="content" required defaultValue={message.content ?? ''} /></label><label>Observación del cambio<textarea name="observation" required /></label><button type="submit" disabled={pendingId !== null}>{pendingId === `edit-${message.id}` ? 'Guardando…' : 'Guardar cambios'}</button></form><form onSubmit={revoke}><label>Observación para revocar<textarea name="observation" required /></label><button type="submit" disabled={pendingId !== null}>Revocar mensaje</button></form>{localError ? <p className={shell.formError} role="alert">{localError}</p> : null}<ErrorLine id={`edit-${message.id}`} error={actionError} /><ErrorLine id={`revoke-${message.id}`} error={actionError} /></div></details> : null}</div></li>
}
