import type { AccessArgs } from 'payload'
import type { User } from '@/payload-types'

type IsAdmin = (args: AccessArgs<User>) => boolean

export const isAdmin: IsAdmin = ({ req: { user } }) => {
  if (!user) return false
  return ['super-admin', 'sales-admin', 'ops-manager'].includes(user.role)
}
