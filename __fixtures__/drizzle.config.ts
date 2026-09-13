// Fixture di esempio per verifica copertura glob (check-globs). Non è una config reale.
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
});
