import { SequelizeStorage, Umzug } from 'umzug';

import { sequelize } from './database.js';
import { env } from './env.js';

const migrationGlob =
  env.NODE_ENV === 'production'
    ? '{dist/src/migrations/*.js,apps/api/dist/src/migrations/*.js}'
    : '{src/migrations/*.ts,apps/api/src/migrations/*.ts}';

export const migrator = new Umzug({
  migrations: {
    glob: migrationGlob
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({
    sequelize
  }),
  logger: console
});
