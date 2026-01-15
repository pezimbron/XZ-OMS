import type { AccessArgs } from 'payload'
import type { User } from '@/payload-types'

type IsSuperAdmin = (args: AccessArgs<User>) => boolean

export const isSuperAdmin: IsSuperAdmin = ({ req: { user } }) => {
  if (!user) return false
  return user.role === 'super-admin'
}
