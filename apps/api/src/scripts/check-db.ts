import { Client } from 'pg';

import { env } from '../config/env.js';

async function main() {
  const config = {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME
  };

  console.log('DB config in use:');
  console.log(
    JSON.stringify(
      {
        host: config.host,
        port: config.port,
        user: config.user,
        database: config.database
      },
      null,
      2
    )
  );

  const adminClient = new Client({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: 'postgres'
  });

  await adminClient.connect();

  const databaseRows = await adminClient.query<{
    datname: string;
  }>(
    "select datname from pg_database where datistemplate = false order by datname"
  );

  console.log('\nDatabases visible to this connection:');
  for (const row of databaseRows.rows) {
    console.log(`- ${row.datname}`);
  }

  await adminClient.end();

  const targetClient = new Client(config);
  await targetClient.connect();

  const currentDb = await targetClient.query<{ current_database: string }>(
    'select current_database()'
  );

  console.log('\nConnected successfully to target database:');
  console.log(`- ${currentDb.rows[0]?.current_database ?? '(unknown)'}`);

  await targetClient.end();
}

main().catch((error) => {
  console.error('\nDB check failed:');
  console.error(error);
  process.exit(1);
});
