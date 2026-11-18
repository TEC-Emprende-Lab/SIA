'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { useId, useRef, useState, type FormEvent } from 'react'
import styles from './interaction-states.module.css'

type Props = {
  title: string
  subject?: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  pendingLabel?: string
  tone?: 'normal' | 'danger'
  requireObservation?: boolean
  pending?: boolean
  error?: string
  onCancel: () => void
  onConfirm: (observation: string) => void
  restoreFocus?: () => void
}

/** Mount only while a decision is open; closing discards only the dialog's fields. */
export function ConfirmAction({
  title, subject, description, confirmLabel, cancelLabel = 'Cancelar',
  pendingLabel = 'Guardando…', tone = 'normal', requireObservation = false,
  pending = false, error, onCancel, onConfirm, restoreFocus,
}: Props) {
  const trigger = useRef<HTMLElement | null>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const observation = useRef<HTMLTextAreaElement>(null)
  const [validation, setValidation] = useState('')
  const errorId = useId()
  let errorDescription: string | undefined
  if (validation || error) errorDescription = errorId

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const note = observation.current?.value.trim() ?? ''
    if (requireObservation && !note) {
      setValidation('Escribe una observación antes de confirmar.')
      observation.current?.focus()
      return
    }
    setValidation('')
    onConfirm(note)
  }

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open && !pending) onCancel() }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.scrim} />
        <Dialog.Content
          role="alertdialog"
          className={styles.confirm}
          data-tone={tone}
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => { if (pending) event.preventDefault() }}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            if (document.activeElement instanceof HTMLElement) trigger.current = document.activeElement
            cancel.current?.focus()
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            if (restoreFocus) restoreFocus()
            else if (trigger.current?.isConnected) trigger.current.focus()
          }}
        >
          <header className={styles.confirmHeader}>
            <Dialog.Title className={styles.confirmTitle}>{title}</Dialog.Title>
            <Dialog.Description className={styles.confirmDescription}>
              {subject && <strong>{subject}</strong>}
              {description}
            </Dialog.Description>
          </header>
          <form className={styles.confirmForm} onSubmit={submit} noValidate>
            {requireObservation && (
              <label className={styles.observation}>
                Observación <span className="sr-only">(obligatoria)</span>
                <textarea
                  ref={observation}
                  required
                  readOnly={pending}
                  aria-invalid={Boolean(validation)}
                  aria-describedby={errorDescription}
                  onChange={() => setValidation('')}
                />
              </label>
            )}
            {(validation || error) && <p id={errorId} className={styles.confirmError} role="alert">{validation || error}</p>}
            <div className={styles.confirmActions}>
              <button ref={cancel} type="button" aria-disabled={pending} onClick={() => { if (!pending) onCancel() }}>
                {cancelLabel}
              </button>
              <button className={styles.confirmPrimary} type="submit" aria-disabled={pending}>
                {confirmLabel}
              </button>
            </div>
            {pending && <p className={styles.pending} role="status">{pendingLabel}</p>}
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
