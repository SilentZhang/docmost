import * as path from 'path';
import { promises as fs } from 'fs';
import { PGlite } from '@electric-sql/pglite';
import {
  Kysely,
  Migrator,
  PostgresDialect,
  FileMigrationProvider,
  DefaultQueryCompiler,
  CamelCasePlugin
} from 'kysely';
import { run } from 'kysely-migration-cli';
import * as dotenv from 'dotenv';
import { envPath } from '../common/helpers/utils';

async function main() {
  dotenv.config({ path: envPath });

  const migrationFolder = path.join(__dirname, './migrations');

  const dbPath = path.join(__dirname, '../../data/db.sqlite');
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  const pglite = new PGlite(dbPath);
  await pglite.waitReady;

  const db = new Kysely<any>({
    dialect: {
      createAdapter() {
        return {
          supportsCreateIfNotExists: false,
          supportsTransactionalDdl: false,
          supportsReturning: true,
          async acquireMigrationLock() {},
          async releaseMigrationLock() {}
        };
      },
      createDriver() {
        return {
          async init() {},
          async acquireConnection() {
            return {
              connection: pglite,
              query: pglite.query.bind(pglite),
              execute: pglite.exec.bind(pglite),
              executeQuery: async <R>(query) => {
                const result = await pglite.query<R>(query.sql, query.parameters as any[]);
                return {
                  rows: result.rows as R[],
                  numAffectedRows: result.rows.length ? BigInt(result.rows.length) : undefined
                };
              },
              streamQuery: async function* <R>() {
                throw new Error('Streaming not supported by PGlite');
                yield { rows: [] as R[] };
              }
            };
          },
          async beginTransaction() {},
          async commitTransaction() {},
          async rollbackTransaction() {},
          async releaseConnection() {},
          async destroy() {
            await pglite.close();
          }
        };
      },
      createQueryCompiler() {
        return new DefaultQueryCompiler();
      },
      createIntrospector(db: Kysely<any>) {
        return {
          async getSchemas() { return []; },
          async getTables() { return []; },
          async getMetadata() { return null; }
        };
      }
    },
    plugins: [new CamelCasePlugin()]
  });

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder,
    }),
  });

  // Run all pending migrations
  const result = await migrator.migrateToLatest();
  
  if (result.error) {
    console.error('Migration failed:', result.error);
    process.exit(1);
  }

  result.results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`> Success: ${it.migrationName} (${it.direction})`);
    } else if (it.status === 'Error') {
      console.error(`> Error: ${it.migrationName} (${it.direction})`);
    }
  });

  if (result.results?.length === 0) {
    console.log('> No pending migrations');
  }
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
