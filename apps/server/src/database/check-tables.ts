import { PGlite } from '@electric-sql/pglite';
import { EnvironmentService } from '../integrations/environment/environment.service';
import * as path from 'path';

async function checkTables() {
  const dbPath = path.join(process.cwd(), './data/db.sqlite');
  const pglite = new PGlite(dbPath);
  await pglite.waitReady;

  try {
    // 查询所有表
    const tables = await pglite.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
    );
    console.log('Tables in database:');
    console.table(tables.rows);

    // 查询workspaces表结构
    const workspaceTable = await pglite.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'workspaces'"
    );
    console.log('\nWorkspaces table structure:');
    console.table(workspaceTable.rows);
  } finally {
    await pglite.close();
  }
}

checkTables().catch(console.error);
