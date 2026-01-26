'use client'

import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { useJsApiLoader } from '@react-google-maps/api'

type ParsedAddress = {
  addressLine1: string
  city: string
  state: string
  zip: string
}

const libraries = ['places'] as ('places')[]

const parsePlace = (place: google.maps.places.PlaceResult): ParsedAddress | null => {
  if (!place.address_components) return null

  const get = (type: string) =>
    place.address_components?.find((c) => c.types.includes(type))?.long_name || ''

  const streetNumber = get('street_number')
  const route = get('route')
  const city = get('locality') || get('sublocality') || get('postal_town')
  const state = get('administrative_area_level_1')
  const zip = get('postal_code')

  const addressLine1 = [streetNumber, route].filter(Boolean).join(' ').trim()

  return {
    addressLine1,
    city,
    state,
    zip,
  }
}

export const AddressAutocomplete: React.FC<{
  value: string
  onChange: (next: string) => void
  onSelect: (parsed: ParsedAddress) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}> = ({ value, onChange, onSelect, disabled, placeholder, className }) => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  const { isLoaded } = useJsApiLoader({
    id: 'google-maps-script',
    googleMapsApiKey: apiKey,
    libraries,
  })

  const containerRef = useRef<HTMLDivElement | null>(null)
  const elementRef = useRef<any>(null)

  const handlePlaceSelect = useCallback(
    async (event: any) => {
      const place = event?.place || event?.detail?.place
      if (!place) return

      try {
        if (typeof place.fetchFields === 'function') {
          await place.fetchFields({ fields: ['addressComponents', 'formattedAddress', 'displayName'] })
        }

        const addressComponents = place.addressComponents || place.address_components
        const formattedAddress = place.formattedAddress || place.formatted_address
        const displayName = place.displayName || place.name

        const parsed = parsePlace({ address_components: addressComponents } as any)
        if (!parsed) return

        const line1 = parsed.addressLine1 || displayName || formattedAddress || ''
        onChange(line1)
        onSelect({ ...parsed, addressLine1: line1 })
      } catch {
        // ignore
      }
    },
    [onChange, onSelect],
  )

  const inputClass = useMemo(
    () =>
      className ||
      'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
    [className],
  )

  const hasNewAutocomplete =
    typeof window !== 'undefined' &&
    (window as any).google?.maps?.places?.PlaceAutocompleteElement

  const shouldFallback = !apiKey || !isLoaded || !hasNewAutocomplete

  useEffect(() => {
    if (shouldFallback) return
    if (!containerRef.current) return
    if (elementRef.current) return

    const El = (window as any).google.maps.places.PlaceAutocompleteElement
    const el = new El()

    const containerEl = containerRef.current

    el.style.width = '100%'
    if (disabled) el.disabled = true
    if (placeholder) el.placeholder = placeholder
    if (value) el.value = value

    const listener = (e: any) => {
      void handlePlaceSelect(e?.detail)
    }

    el.addEventListener('gmp-placeselect', listener)
    containerEl.appendChild(el)
    elementRef.current = { el, listener }

    return () => {
      try {
        el.removeEventListener('gmp-placeselect', listener)
        containerEl.removeChild(el)
      } catch {
        // ignore
      } finally {
        elementRef.current = null
      }
    }
  }, [disabled, handlePlaceSelect, placeholder, shouldFallback, value])

  useEffect(() => {
    const current = elementRef.current?.el
    if (!current) return
    try {
      current.disabled = !!disabled
      current.placeholder = placeholder || ''
      current.value = value || ''
    } catch {
      // ignore
    }
  }, [disabled, placeholder, value])

  if (shouldFallback) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={inputClass}
      />
    )
  }

  return <div ref={containerRef} className={inputClass} />
}
