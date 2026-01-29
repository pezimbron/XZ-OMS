import { useEffect, useMemo, useRef, useState } from 'react'

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error'

type UseAutosaveFieldArgs<T> = {
  value: T
  onSave: (next: T) => Promise<void>
  debounceMs?: number
}

export const useAutosaveField = <T>({ value, onSave, debounceMs = 700 }: UseAutosaveFieldArgs<T>) => {
  const [localValue, setLocalValue] = useState<T>(value)
  const [status, setStatus] = useState<AutosaveStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const lastSaved = useRef<T>(value)
  const lastInput = useRef<T>(value)
  const lastExternalKey = useRef<string>('')
  const inflight = useRef<Promise<void> | null>(null)

  const makeExternalKey = (v: unknown): string => {
    if (v === null) return 'null'
    const t = typeof v
    if (t === 'undefined') return 'undefined'
    if (t === 'string' || t === 'number' || t === 'boolean' || t === 'bigint') return `${t}:${String(v)}`
    if (t === 'symbol') return 'symbol'
    if (t === 'function') return 'function'
    try {
      return `json:${JSON.stringify(v)}`
    } catch {
      return `ref:${Object.prototype.toString.call(v)}`
    }
  }

  useEffect(() => {
    if (Object.is(value, lastInput.current)) return

    const nextKey = makeExternalKey(value)
    if (nextKey === lastExternalKey.current) return

    lastExternalKey.current = nextKey
    lastInput.current = value
    setLocalValue(value)
  }, [value])

  const save = async (next: T) => {
    if (Object.is(next, lastSaved.current)) return
    setStatus('saving')
    setError(null)

    try {
      const p = onSave(next)
      inflight.current = p
      await p
      lastSaved.current = next
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 1200)
    } catch (e: any) {
      setStatus('error')
      setError(e?.message || 'Failed to save')
      setTimeout(() => setStatus('idle'), 8000)
    } finally {
      inflight.current = null
    }
  }

  const debouncedTimer = useRef<any>(null)

  const scheduleSave = (next: T) => {
    if (debounceMs <= 0) {
      void save(next)
      return
    }
    if (debouncedTimer.current) clearTimeout(debouncedTimer.current)
    debouncedTimer.current = setTimeout(() => {
      void save(next)
    }, debounceMs)
  }

  useEffect(() => {
    return () => {
      if (debouncedTimer.current) clearTimeout(debouncedTimer.current)
    }
  }, [])

  const api = useMemo(
    () => ({
      value: localValue,
      setLocal: (next: T) => {
        setLocalValue(next)
      },
      commit: (next: T) => {
        setLocalValue(next)
        void save(next)
      },
      setValue: (next: T) => {
        setLocalValue(next)
        scheduleSave(next)
      },
      onBlur: () => {
        void save(localValue)
      },
      saveNow: () => save(localValue),
      status,
      error,
    }),
    [localValue, status, error],
  )

  return api
}
