import bcrypt from 'bcrypt'
import postgres from 'postgres'
import { users } from '../lib/placeholder-data'

const sql = postgres(process.env.POSTGRES_URL!, {
  ssl: { rejectUnauthorized: false }, // fix SSL for self-signed certs
})

async function seedUsers(tx: typeof sql) {
  await tx`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`
  await tx`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );
  `

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10)
    await tx`
      INSERT INTO users (id, name, email, password)
      VALUES (${user.id}, ${user.name}, ${user.email}, ${hashedPassword})
      ON CONFLICT (id) DO NOTHING;
    `
  }
}

export async function GET() {
  try {
    // Use a proper transaction and await seedUsers
    await sql.begin(async (tx) => {
      await seedUsers(tx)
    })

    return Response.json({ message: 'Database seeded successfully' })
  } catch (error) {
    console.error('Seeding failed:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : error },
      { status: 500 }
    )
  }
}
