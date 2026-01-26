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

const parsePlace = (place: any): ParsedAddress | null => {
  const components = place?.address_components || place?.addressComponents
  if (!components || !Array.isArray(components)) return null

  const get = (type: string) => {
    const c = components.find((x: any) => Array.isArray(x?.types) && x.types.includes(type))
    return (
      c?.long_name ||
      c?.longText ||
      c?.short_name ||
      c?.shortText ||
      ''
    )
  }

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
  const isFocusedRef = useRef(false)
  const lastAppliedRef = useRef<{ disabled: boolean; placeholder: string }>({ disabled: false, placeholder: '' })

  const handlePlaceSelect = useCallback(
    async (event: any) => {
      console.log('AddressAutocomplete place select event:', event)
      const prediction =
        event?.placePrediction || event?.detail?.placePrediction || event?.detail?.place_prediction

      let place: any = event?.place || event?.detail?.place || event?.detail

      try {
        if (!place && prediction && typeof prediction.toPlace === 'function') {
          place = await prediction.toPlace()
        }
      } catch (e) {
        console.error('PlaceAutocompleteElement toPlace() failed:', e)
      }

      if (!place) return

      let placeObj: any = place

      try {
        if (typeof place.fetchFields === 'function') {
          await place.fetchFields({ fields: ['addressComponents', 'formattedAddress', 'displayName'] })
        }
      } catch (e) {
        console.error('PlaceAutocompleteElement fetchFields failed:', e)
      }

      try {
        if (typeof place.toJSON === 'function') {
          placeObj = place.toJSON()
        }

        const formattedAddress = placeObj?.formattedAddress || placeObj?.formatted_address
        const displayName = placeObj?.displayName || placeObj?.name

        const parsed = parsePlace(placeObj)
        const line1 = parsed?.addressLine1 || displayName || formattedAddress || ''
        if (!line1) return

        try {
          const el = elementRef.current?.el
          if (el && typeof el.value !== 'undefined') el.value = line1
        } catch {
          // ignore
        }

        onChange(line1)
        onSelect({
          addressLine1: line1,
          city: parsed?.city || '',
          state: parsed?.state || '',
          zip: parsed?.zip || '',
        })
      } catch (e) {
        console.error('PlaceAutocompleteElement placeselect handler failed:', e)
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

    lastAppliedRef.current.disabled = !!disabled
    lastAppliedRef.current.placeholder = placeholder || ''

    const onFocusIn = () => {
      isFocusedRef.current = true
    }

    const onFocusOut = () => {
      isFocusedRef.current = false
    }

    const onPlaceSelect = (e: any) => {
      void handlePlaceSelect(e)
    }

    const onPlaceSelectCapture = (e: any) => {
      void handlePlaceSelect(e)
    }

    const onSelect = (e: any) => {
      void handlePlaceSelect(e)
    }

    const onSelectCapture = (e: any) => {
      void handlePlaceSelect(e)
    }

    el.addEventListener('focusin', onFocusIn)
    el.addEventListener('focusout', onFocusOut)
    // New Places UI Kit event name is gmp-select
    el.addEventListener('gmp-select', onSelect)
    containerEl.addEventListener('gmp-select', onSelectCapture, true)

    // Backward/variant compatibility
    el.addEventListener('gmp-placeselect', onPlaceSelect)
    containerEl.addEventListener('gmp-placeselect', onPlaceSelectCapture, true)
    containerEl.appendChild(el)
    elementRef.current = {
      el,
      onSelect,
      onSelectCapture,
      onPlaceSelect,
      onPlaceSelectCapture,
      onFocusIn,
      onFocusOut,
    }

    return () => {
      try {
        el.removeEventListener('focusin', onFocusIn)
        el.removeEventListener('focusout', onFocusOut)

        el.removeEventListener('gmp-select', onSelect)
        containerEl.removeEventListener('gmp-select', onSelectCapture, true)

        el.removeEventListener('gmp-placeselect', onPlaceSelect)
        containerEl.removeEventListener('gmp-placeselect', onPlaceSelectCapture, true)
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
      const nextDisabled = !!disabled
      const nextPlaceholder = placeholder || ''

      if (!isFocusedRef.current) {
        if (lastAppliedRef.current.disabled !== nextDisabled) {
          current.disabled = nextDisabled
          lastAppliedRef.current.disabled = nextDisabled
        }
        if (lastAppliedRef.current.placeholder !== nextPlaceholder) {
          current.placeholder = nextPlaceholder
          lastAppliedRef.current.placeholder = nextPlaceholder
        }
      }
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
