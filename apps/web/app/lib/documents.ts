/**
 * Archivos privados del emprendimiento.
 * La URL firmada se pide al abrir; no se incrusta el binario.
 */

export type StoredDocument = {
  id: string
  entrepreneurship_id: string
  name: string
  mime: string
  size: number
  uploaded_by: string
  created_at: string
}

export type DocumentAccess = { url: string; expires_in: number }

export type DocumentResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function detailMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) {
    return fallback
  }
  const detail = payload.detail
  if (typeof detail === 'string' && detail.trim()) {
    return detail
  }
  return fallback
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function parseDocument(value: unknown): StoredDocument | null {
  if (!isRecord(value)) {
    return null
  }
  const id = typeof value.id === 'string' ? value.id : ''
  const entrepreneurshipId = typeof value.entrepreneurship_id === 'string' ? value.entrepreneurship_id : ''
  const name = typeof value.name === 'string' ? value.name : ''
  const mime = typeof value.mime === 'string' ? value.mime : ''
  const uploadedBy = typeof value.uploaded_by === 'string' ? value.uploaded_by : ''
  const createdAt = typeof value.created_at === 'string' ? value.created_at : ''
  const size = value.size
  if (!id || !entrepreneurshipId || !name || !mime || !uploadedBy || !createdAt || typeof size !== 'number') {
    return null
  }
  if ('storage_key' in value) {
    return null
  }
  return {
    id,
    entrepreneurship_id: entrepreneurshipId,
    name,
    mime,
    size,
    uploaded_by: uploadedBy,
    created_at: createdAt,
  }
}

export async function uploadPrivateDocument(
  entrepreneurshipId: string,
  file: File,
): Promise<DocumentResult<StoredDocument>> {
  let response: Response
  try {
    const body = new FormData()
    body.append('file', file, file.name)
    response = await fetch(`/api/sia/entrepreneurships/${entrepreneurshipId}/documents`, {
      method: 'POST',
      body,
      cache: 'no-store',
    })
  } catch {
    return { ok: false, status: 0, message: 'No se pudo cargar el archivo.' }
  }
  const payload = await readJson(response)
  if (!response.ok) {
    return { ok: false, status: response.status, message: detailMessage(payload, 'No se pudo guardar el archivo.') }
  }
  const document = parseDocument(payload)
  if (!document) {
    return { ok: false, status: response.status, message: 'La respuesta del archivo no es válida.' }
  }
  return { ok: true, data: document }
}

export async function requestDocumentAccess(
  entrepreneurshipId: string,
  documentId: string,
): Promise<DocumentResult<DocumentAccess>> {
  let response: Response
  try {
    response = await fetch(
      `/api/sia/entrepreneurships/${entrepreneurshipId}/documents/${documentId}/access`,
      { cache: 'no-store' },
    )
  } catch {
    return { ok: false, status: 0, message: 'No se pudo preparar el enlace del archivo.' }
  }
  const payload = await readJson(response)
  if (!response.ok || !isRecord(payload) || typeof payload.url !== 'string' || !payload.url) {
    return {
      ok: false,
      status: response.status,
      message: detailMessage(payload, 'No se pudo preparar el enlace del archivo.'),
    }
  }
  const expiresIn = payload.expires_in
  if (typeof expiresIn !== 'number') {
    return { ok: false, status: response.status, message: 'La respuesta del enlace no es válida.' }
  }
  return { ok: true, data: { url: payload.url, expires_in: expiresIn } }
}
