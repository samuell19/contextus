import { sequelize } from '../config/database.js';
import { migrator } from '../config/migrations.js';

async function run() {
  await sequelize.authenticate();
  await migrator.up();
  await sequelize.close();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
