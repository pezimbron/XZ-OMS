export const normalizeRelationId = (value: unknown): number | string | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') return null
    const asNumber = Number(trimmed)
    if (!Number.isNaN(asNumber) && Number.isFinite(asNumber)) return asNumber
    return trimmed
  }
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return normalizeRelationId((value as any).id)
  }
  return null
}
