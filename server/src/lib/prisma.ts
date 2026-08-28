import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';

const databaseUrl = process.env.DATABASE_URL ?? 'file:./dev.db';

// El driver se elige solo según la URL: "file:..." (dev, SQLite) vs.
// "postgresql://..." (prod). Pasar de un entorno al otro es cambiar
// DATABASE_URL y el `provider` en prisma/schema.prisma — no este archivo.
const adapter = databaseUrl.startsWith('file:')
  ? new PrismaBetterSqlite3({ url: databaseUrl })
  : new PrismaPg(databaseUrl);

export const prisma = new PrismaClient({ adapter });
