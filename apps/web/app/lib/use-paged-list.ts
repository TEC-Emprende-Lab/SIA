'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type PageResult<T> = { ok: true; data: T[] } | { ok: false; status: number; message: string }

export type PagedState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T[] }
  | { status: 'forbidden'; message: string }
  | { status: 'missing'; message: string }
  | { status: 'error'; message: string }

const API_MAX_LIMIT = 100

type Range<T> = { ok: true; data: T[]; more: boolean } | { ok: false; status: number; message: string }

async function fetchRange<T>(
  pageUrl: (limit: number, offset: number) => string,
  fetchPage: (url: string) => Promise<PageResult<T>>,
  offset: number,
  count: number,
): Promise<Range<T>> {
  let items: T[] = []
  while (items.length < count) {
    const limit = Math.min(API_MAX_LIMIT, count - items.length)
    const result = await fetchPage(pageUrl(limit, offset + items.length))
    if (!result.ok) {
      return result
    }
    items = [...items, ...result.data]
    if (result.data.length < limit) {
      return { ok: true, data: items, more: false }
    }
  }
  return { ok: true, data: items, more: true }
}

function failure<T>(result: { status: number; message: string }): PagedState<T> {
  if (result.status === 403) {
    return { status: 'forbidden', message: result.message }
  }
  if (result.status === 404) {
    return { status: 'missing', message: result.message }
  }
  return { status: 'error', message: result.message }
}

/**
 * Lista paginada por limit y offset, como la exponen los listados de la API.
 * reload vuelve a pedir la cantidad ya cargada para conservar las páginas abiertas tras una mutación.
 */
export function usePagedList<T extends { id: string }>(
  pageUrl: ((limit: number, offset: number) => string) | null,
  fetchPage: (url: string) => Promise<PageResult<T>>,
  options: { pageSize?: number; missingMessage?: string } = {},
) {
  const pageSize = options.pageSize ?? 50
  const missingMessage = options.missingMessage ?? 'No encontrado'
  const key = pageUrl ? pageUrl(pageSize, 0) : null
  const pageUrlRef = useRef(pageUrl)
  const fetchRef = useRef(fetchPage)
  const loadedKeyRef = useRef<string | null>(null)
  const countRef = useRef(pageSize)
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<PagedState<T>>({ status: 'loading' })
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState<string | null>(null)

  useEffect(() => {
    pageUrlRef.current = pageUrl
    fetchRef.current = fetchPage
  })

  useEffect(() => {
    const build = pageUrlRef.current
    if (!key || !build) {
      loadedKeyRef.current = null
      setState({ status: 'missing', message: missingMessage })
      setHasMore(false)
      return
    }
    let cancelled = false
    if (loadedKeyRef.current !== key) {
      countRef.current = pageSize
      setState({ status: 'loading' })
    }
    void fetchRange(build, fetchRef.current, 0, countRef.current).then((result) => {
      if (cancelled) {
        return
      }
      setMoreError(null)
      if (!result.ok) {
        loadedKeyRef.current = null
        setState(failure(result))
        setHasMore(false)
        return
      }
      loadedKeyRef.current = key
      setState({ status: 'ready', data: result.data })
      setHasMore(result.more)
    })
    return () => {
      cancelled = true
    }
  }, [key, attempt, missingMessage, pageSize])

  const reload = useCallback(() => setAttempt((value) => value + 1), [])

  const loadMore = useCallback(async () => {
    const build = pageUrlRef.current
    if (!build || state.status !== 'ready' || loadingMore) {
      return
    }
    setLoadingMore(true)
    setMoreError(null)
    const current = state.data
    const result = await fetchRange(build, fetchRef.current, current.length, pageSize)
    setLoadingMore(false)
    if (!result.ok) {
      setMoreError(result.message)
      return
    }
    const known = new Set(current.map((item) => item.id))
    const merged = [...current, ...result.data.filter((item) => !known.has(item.id))]
    countRef.current = Math.max(pageSize, merged.length)
    setState({ status: 'ready', data: merged })
    setHasMore(result.more)
  }, [loadingMore, pageSize, state])

  return { state, hasMore, loadingMore, moreError, loadMore, reload }
}
