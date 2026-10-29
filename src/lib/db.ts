import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function getDatabaseUrl() {
  const candidates = [
    path.resolve(process.cwd(), 'db/custom.db'),
    path.resolve('/opt/render/project/src/db/custom.db'),
    path.resolve(process.cwd(), '../db/custom.db'),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return `file:${candidate}`
    }
  }

  const dbDir = path.resolve(process.cwd(), 'db')
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }
  return `file:${path.resolve(dbDir, 'custom.db')}`
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: getDatabaseUrl(),
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
