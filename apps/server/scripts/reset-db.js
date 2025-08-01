const fs = require('fs/promises');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  const dbPath = path.join(__dirname, '../data');
  
  try {
    await fs.rm(dbPath, { recursive: true, force: true });
  } catch (err) {
    console.log('No existing database to remove');
  }

  await fs.mkdir(dbPath, { recursive: true });
  console.log('Database directory reset successfully');

  // Run migrations
  execSync('pnpm run migration:up', { 
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
}

main().catch(err => {
  console.error('Error resetting database:', err);
  process.exit(1);
});
