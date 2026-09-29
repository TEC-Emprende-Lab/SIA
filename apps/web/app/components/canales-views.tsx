'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'

import { useMe } from './authenticated-shell'
import shell from './expediente.module.css'
import styles from './comunicacion.module.css'
import { LoadMore } from './load-more'
import { formatDateTime } from '../lib/expediente'
import { usePagedList } from '../lib/use-paged-list'
import {
  canManageMeetings,
  channelUrl,
  channelsUrl,
  MESSAGE_PAGE_SIZE,
  parseChannel,
  parseChannelList,
  parseMessage,
  parseMessageList,
  parseReceipt,
  parseUnread,
  requestComunicacion,
  requiredText,
  type Channel,
  type Message,
} from '../lib/comunicacion'

const fetchChannels = (url: string) => requestComunicacion(url, parseChannelList)

function field(data: FormData, name: string): string {
  const value = data.get(name)
  return typeof value === 'string' ? value : ''
}

export function ChannelsPanel({ entrepreneurshipId, cycleId }: { entrepreneurshipId: string; cycleId?: string }) {
  const me = useMe()
  const channels = usePagedList(
    (limit, offset) => channelsUrl({ entrepreneurshipId, cycleId, limit, offset }),
    fetchChannels,
  )
  const state = channels.state
  const [openId, setOpenId] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)
  const headingId = `canales-${cycleId ?? entrepreneurshipId}`

  async function createChannel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) {
      return
    }
    const name = requiredText(field(new FormData(event.currentTarget), 'name'), 'El nombre es obligatorio.')
    if ('error' in name) {
      setFormError(name.error)
      return
    }
    if (name.text.length > 200) {
      setFormError('El nombre admite hasta 200 caracteres.')
      return
    }
    setPending(true)
    setFormError(null)
    const result = await requestComunicacion('/api/sia/channels', parseChannel, {
      method: 'POST',
      body: { entrepreneurship_id: entrepreneurshipId, cycle_id: cycleId ?? null, name: name.text },
    })
    setPending(false)
    if (!result.ok) {
      setFormError(result.message)
      return
    }
    setFormKey((value) => value + 1)
    setOpenId(result.data.id)
    channels.reload()
  }

  return (
    <section className={shell.section} aria-labelledby={headingId}>
      <h2 id={headingId}>{cycleId ? 'Canales del ciclo' : 'Canales del emprendimiento'}</h2>
      <p className={shell.meta}>Los mensajes se consultan al abrir el canal o con Actualizar. No llegan en tiempo real.</p>
      {state.status === 'loading' ? <p className={shell.meta}>Cargando canales…</p> : null}
      {state.status === 'forbidden' || state.status === 'missing' || state.status === 'error' ? (
        <>
          <p className={shell.formError} role="alert">
            {state.message}
          </p>
          {state.status === 'error' ? (
            <button type="button" className={shell.buttonSecondary} onClick={channels.reload}>
              Reintentar
            </button>
          ) : null}
        </>
      ) : null}
      {state.status === 'ready' ? (
        <>
          {state.data.length === 0 ? <p className={shell.meta}>No hay canales.</p> : null}
          <div className={styles.stack}>
            {state.data.map((channel) => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                userId={me.id}
                open={openId === channel.id}
                onToggle={() => setOpenId((current) => (current === channel.id ? null : channel.id))}
              />
            ))}
          </div>
          <LoadMore
            hasMore={channels.hasMore}
            loading={channels.loadingMore}
            error={channels.moreError}
            onLoad={() => void channels.loadMore()}
            label="Cargar más canales"
          />
          {canManageMeetings(me.role) ? (
            <form key={formKey} className={shell.form} onSubmit={(event) => void createChannel(event)}>
              <h3>Nuevo canal</h3>
              <label className={styles.field}>
                Nombre
                <input name="name" required maxLength={200} disabled={pending} />
              </label>
              {formError ? (
                <p className={shell.formError} role="alert">
                  {formError}
                </p>
              ) : null}
              <div className={shell.actions}>
                <button className={shell.button} type="submit" disabled={pending}>
                  {pending ? 'Guardando…' : 'Crear canal'}
                </button>
              </div>
            </form>
          ) : null}
        </>
      ) : null}
    </section>
  )
}

function ChannelCard({
  channel,
  userId,
  open,
  onToggle,
}: {
  channel: Channel
  userId: string
  open: boolean
  onToggle: () => void
}) {
  const [unread, setUnread] = useState<number | null>(null)

  const refreshUnread = useCallback(async () => {
    const result = await requestComunicacion(channelUrl(channel.id, 'unread'), parseUnread)
    setUnread(result.ok ? result.data : null)
  }, [channel.id])

  useEffect(() => {
    void refreshUnread()
  }, [refreshUnread])

  return (
    <article className={`${styles.block} ${unread ? styles.unread : ''}`}>
      <div className={styles.row}>
        <h3>{channel.name}</h3>
        <span className={shell.meta}>
          {channel.revoked_at ? 'Revocado' : unread === null ? '' : unread === 1 ? '1 sin leer' : `${unread} sin leer`}
        </span>
      </div>
      <div className={shell.actions}>
        <button type="button" className={shell.buttonSecondary} onClick={onToggle} aria-expanded={open}>
          {open ? 'Cerrar canal' : 'Abrir canal'}
        </button>
      </div>
      {open ? (
        <ChannelThread channel={channel} userId={userId} onRead={refreshUnread} />
      ) : null}
    </article>
  )
}

type ThreadState =
  | { status: 'loading' }
  | { status: 'ready'; messages: Message[]; complete: boolean }
  | { status: 'error'; message: string }

type ActionError = { id: string; message: string } | null

function ChannelThread({
  channel,
  userId,
  onRead,
}: {
  channel: Channel
  userId: string
  onRead: () => Promise<void>
}) {
  const [attempt, setAttempt] = useState(0)
  const [pages, setPages] = useState(1)
  const [state, setState] = useState<ThreadState>({ status: 'loading' })
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<ActionError>(null)
  const [formKey, setFormKey] = useState(0)
  const writable = channel.revoked_at === null

  useEffect(() => {
    let cancelled = false
    async function load() {
      const result = await requestComunicacion(
        channelUrl(channel.id, 'messages', { limit: Math.min(MESSAGE_PAGE_SIZE * pages, 100), offset: 0 }),
        parseMessageList,
      )
      if (cancelled) {
        return
      }
      if (!result.ok) {
        setState({ status: 'error', message: result.message })
        return
      }
      let messages = result.data
      let complete = messages.length < Math.min(MESSAGE_PAGE_SIZE * pages, 100)
      while (!complete && messages.length < MESSAGE_PAGE_SIZE * pages) {
        const next = await requestComunicacion(
          channelUrl(channel.id, 'messages', { limit: MESSAGE_PAGE_SIZE, offset: messages.length }),
          parseMessageList,
        )
        if (cancelled) {
          return
        }
        if (!next.ok) {
          setState({ status: 'error', message: next.message })
          return
        }
        messages = [...messages, ...next.data]
        complete = next.data.length < MESSAGE_PAGE_SIZE
      }
      setState({ status: 'ready', messages, complete })
      const last = messages.at(-1)
      if (last) {
        const receipt = await requestComunicacion(channelUrl(channel.id, 'read-receipt'), parseReceipt, {
          method: 'PUT',
          body: { last_read_message_id: last.id },
        })
        if (!cancelled && receipt.ok) {
          void onRead()
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [channel.id, pages, attempt, onRead])

  async function run(id: string, exec: () => Promise<{ ok: boolean; message?: string }>) {
    if (pendingId) {
      return false
    }
    setPendingId(id)
    setActionError(null)
    const result = await exec()
    setPendingId(null)
    if (!result.ok) {
      setActionError({ id, message: result.message ?? 'No se pudo guardar.' })
      return false
    }
    setAttempt((value) => value + 1)
    return true
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = requiredText(field(new FormData(event.currentTarget), 'content'), 'Escribe un mensaje.')
    if ('error' in content) {
      setActionError({ id: 'send', message: content.error })
      return
    }
    const sent = await run('send', () =>
      requestComunicacion(channelUrl(channel.id, 'messages'), parseMessage, {
        method: 'POST',
        body: { content: content.text, mentioned_user_ids: [] },
      }),
    )
    if (sent) {
      setFormKey((value) => value + 1)
    }
  }

  return (
    <div className={styles.stack}>
      <div className={shell.actions}>
        <button type="button" className={shell.buttonSecondary} onClick={() => setAttempt((value) => value + 1)}>
          Actualizar
        </button>
      </div>
      {state.status === 'loading' ? <p className={shell.meta}>Cargando mensajes…</p> : null}
      {state.status === 'error' ? (
        <p className={shell.formError} role="alert">
          {state.message}
        </p>
      ) : null}
      {state.status === 'ready' ? (
        <>
          {state.messages.length === 0 ? <p className={shell.meta}>No hay mensajes.</p> : null}
          <ol className={shell.list}>
            {state.messages.map((message) => (
              <MessageItem
                key={`${message.id}:${message.revision}`}
                message={message}
                own={message.created_by === userId}
                writable={writable}
                pendingId={pendingId}
                actionError={actionError}
                onEdit={(content, observation) =>
                  void run(`edit-${message.id}`, () =>
                    requestComunicacion(channelUrl(channel.id, `messages/${message.id}`), parseMessage, {
                      method: 'PUT',
                      body: { content, expected_revision: message.revision, observation },
                    }),
                  )
                }
                onRevoke={(observation) =>
                  void run(`revoke-${message.id}`, () =>
                    requestComunicacion(channelUrl(channel.id, `messages/${message.id}`), parseMessage, {
                      method: 'DELETE',
                      body: { expected_revision: message.revision, observation },
                    }),
                  )
                }
              />
            ))}
          </ol>
          {!state.complete ? (
            <div className={shell.actions}>
              <button type="button" className={shell.buttonSecondary} onClick={() => setPages((value) => value + 1)}>
                Cargar más mensajes
              </button>
            </div>
          ) : null}
        </>
      ) : null}
      {writable ? (
        <form key={formKey} className={shell.form} onSubmit={(event) => void send(event)}>
          <label className={styles.field}>
            Mensaje
            <textarea name="content" required maxLength={20000} disabled={pendingId === 'send'} />
          </label>
          <ErrorLine id="send" error={actionError} />
          <div className={shell.actions}>
            <button className={shell.button} type="submit" disabled={pendingId === 'send'}>
              {pendingId === 'send' ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        </form>
      ) : (
        <p className={shell.meta}>El canal está revocado y no admite mensajes.</p>
      )}
    </div>
  )
}

function ErrorLine({ id, error }: { id: string; error: ActionError }) {
  if (!error || error.id !== id) {
    return null
  }
  return (
    <p className={shell.formError} role="alert">
      {error.message}
    </p>
  )
}

function MessageItem({
  message,
  own,
  writable,
  pendingId,
  actionError,
  onEdit,
  onRevoke,
}: {
  message: Message
  own: boolean
  writable: boolean
  pendingId: string | null
  actionError: ActionError
  onEdit: (content: string, observation: string) => void
  onRevoke: (observation: string) => void
}) {
  const [localError, setLocalError] = useState<string | null>(null)
  const revoked = message.revoked_at !== null

  function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const content = requiredText(field(data, 'content'), 'Escribe un mensaje.')
    const note = requiredText(field(data, 'observation'), 'La observación es obligatoria.')
    if ('error' in content) {
      setLocalError(content.error)
      return
    }
    if ('error' in note) {
      setLocalError(note.error)
      return
    }
    setLocalError(null)
    onEdit(content.text, note.text)
  }

  function handleRevoke(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const note = requiredText(field(new FormData(event.currentTarget), 'observation'), 'La observación es obligatoria.')
    if ('error' in note) {
      setLocalError(note.error)
      return
    }
    setLocalError(null)
    onRevoke(note.text)
  }

  return (
    <li className={styles.block}>
      <div className={styles.row}>
        <strong>{own ? 'Tú' : 'Participante'}</strong>
        <span className={shell.meta}>
          {formatDateTime(message.created_at)}
          {message.revision > 1 && !revoked ? ' · editado' : ''}
        </span>
      </div>
      <p className={styles.prose}>{revoked ? 'Mensaje revocado.' : message.content}</p>
      {own && writable && !revoked ? (
        <details>
          <summary>Editar o revocar</summary>
          <form className={shell.form} onSubmit={handleEdit}>
            <label className={styles.field}>
              Mensaje
              <textarea name="content" required defaultValue={message.content ?? ''} />
            </label>
            <label className={styles.field}>
              Observación del cambio
              <textarea name="observation" required />
            </label>
            <div className={shell.actions}>
              <button className={shell.button} type="submit" disabled={pendingId !== null}>
                {pendingId === `edit-${message.id}` ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
          <form className={shell.form} onSubmit={handleRevoke}>
            <p className={shell.meta}>El mensaje revocado se oculta y su historial se conserva.</p>
            <label className={styles.field}>
              Observación
              <textarea name="observation" required />
            </label>
            <div className={shell.actions}>
              <button className={shell.buttonSecondary} type="submit" disabled={pendingId !== null}>
                {pendingId === `revoke-${message.id}` ? 'Guardando…' : 'Revocar mensaje'}
              </button>
            </div>
          </form>
          {localError ? (
            <p className={shell.formError} role="alert">
              {localError}
            </p>
          ) : null}
          <ErrorLine id={`edit-${message.id}`} error={actionError} />
          <ErrorLine id={`revoke-${message.id}`} error={actionError} />
        </details>
      ) : null}
    </li>
  )
}
