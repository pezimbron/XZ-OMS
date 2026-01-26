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
  const inflight = useRef<Promise<void> | null>(null)

  useEffect(() => {
    if (Object.is(value, lastInput.current)) return
    lastInput.current = value
    setLocalValue(value)
    lastSaved.current = value
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
      setTimeout(() => setStatus('idle'), 2500)
    } finally {
      inflight.current = null
    }
  }

  const debouncedTimer = useRef<any>(null)

  const scheduleSave = (next: T) => {
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
