import type { User } from '@/app/lib/definitions'
import bcrypt from 'bcrypt'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import postgres from 'postgres'
import { z } from 'zod'
import { authConfig } from './auth.config'

const sql = postgres(process.env.POSTGRES_URL!, {
  ssl: { rejectUnauthorized: false },
})

async function getUser(email: string): Promise<User | null> {
  try {
    const user = await sql<User[]>`SELECT * FROM users WHERE email=${email}`
    return user[0]
  } catch (error) {
    console.error('Failed to fetch user:', error)
    throw new Error('Failed to fetch user.')
  }
}

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        console.log('Credentials received:', credentials)

        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials)

        if (!parsedCredentials.success) {
          console.warn('Invalid input:', parsedCredentials.error)
          return null
        }

        const { email, password } = parsedCredentials.data
        const user = await getUser(email)

        if (!user) {
          console.warn('User not found:', email)
          return null
        }

        const passwordsMatch = await bcrypt.compare(password, user.password)
        if (!passwordsMatch) {
          console.warn('Password mismatch for:', email)
          return null
        }

        const { password: _removed, ...safeUser } = user
        return safeUser
      },
    }),
  ],
})
