import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Prisma 7: la URL de conexión para el CLI (migrate, studio, etc.) vive acá,
// no en prisma/schema.prisma. El PrismaClient en runtime usa un driver
// adapter (ver src/lib/prisma.ts), que lee la misma DATABASE_URL.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
