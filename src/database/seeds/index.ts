import 'dotenv/config';
import dataSource from '../data-source';
import { seedAdminUsers } from './001-admin-users.seed';

// Register seeds in execution order.
const seeds = [seedAdminUsers];

async function run(): Promise<void> {
  await dataSource.initialize();
  try {
    for (const seed of seeds) {
      await seed(dataSource);
    }
    console.log('All seeds completed.');
  } finally {
    await dataSource.destroy();
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
