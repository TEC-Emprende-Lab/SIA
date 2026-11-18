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
  const loadGeneration = useRef(0)
  const loadingMoreRef = useRef(false)
  const refreshing = useRef(false)
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<PagedState<T>>({ status: 'loading' })
  const [stateKey, setStateKey] = useState<string | null>(key)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState<string | null>(null)

  useEffect(() => {
    pageUrlRef.current = pageUrl
    fetchRef.current = fetchPage
  })

  useEffect(() => {
    const generation = ++loadGeneration.current
    loadingMoreRef.current = false
    setLoadingMore(false)
    setMoreError(null)
    setStateKey(key)
    const build = pageUrlRef.current
    if (!key || !build) {
      refreshing.current = false
      loadedKeyRef.current = null
      setState({ status: 'missing', message: missingMessage })
      setHasMore(false)
      return
    }
    refreshing.current = true
    if (loadedKeyRef.current !== key) {
      countRef.current = pageSize
      setState({ status: 'loading' })
    }
    void fetchRange(build, fetchRef.current, 0, countRef.current).then((result) => {
      if (generation !== loadGeneration.current) {
        return
      }
      refreshing.current = false
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
      loadGeneration.current += 1
    }
  }, [key, attempt, missingMessage, pageSize])

  const reload = useCallback(() => setAttempt((value) => value + 1), [])

  const loadMore = useCallback(async () => {
    const build = pageUrlRef.current
    if (!build || stateKey !== key || state.status !== 'ready' || !hasMore || loadingMoreRef.current || refreshing.current) {
      return
    }
    const generation = loadGeneration.current
    loadingMoreRef.current = true
    setLoadingMore(true)
    setMoreError(null)
    const current = state.data
    const result = await fetchRange(build, fetchRef.current, current.length, pageSize)
    if (generation !== loadGeneration.current) return
    loadingMoreRef.current = false
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
  }, [hasMore, key, pageSize, state, stateKey])

  if (stateKey !== key) {
    return { state: { status: 'loading' } as PagedState<T>, hasMore: false, loadingMore: false, moreError: null, loadMore, reload }
  }
  return { state, hasMore, loadingMore, moreError, loadMore, reload }
}
