import { normalizeRelationId } from './normalizeRelationId'

const normalizePatch = (data: Record<string, unknown>) => {
  const normalized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    if (
      key === 'client' ||
      key === 'tech' ||
      key === 'workflowTemplate'
    ) {
      normalized[key] = normalizeRelationId(value)
      continue
    }

    normalized[key] = value
  }

  return normalized
}

export const patchJob = async (jobId: string | number, partial: Record<string, unknown>) => {
  const normalized = normalizePatch(partial)
  const res = await fetch(`/api/jobs/${jobId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(normalized),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Failed to update job (${res.status})`)
  }

  return res.json()
}
