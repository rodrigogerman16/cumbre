import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

// Dev: SQLite vía better-sqlite3. Prod: reemplazar por @prisma/adapter-pg
// apuntando a la misma DATABASE_URL (postgresql://...) — el resto del código
// que usa `prisma` no cambia.
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? 'file:./dev.db',
});

export const prisma = new PrismaClient({ adapter });
