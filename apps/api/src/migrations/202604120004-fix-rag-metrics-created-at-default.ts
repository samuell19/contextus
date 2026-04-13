import type { QueryInterface } from 'sequelize';

export async function up({ context }: { context: QueryInterface }) {
  await context.sequelize.query(`
    ALTER TABLE rag_metric_events
    ALTER COLUMN created_at SET DEFAULT NOW(),
    ALTER COLUMN created_at SET NOT NULL
  `);
}

export async function down({ context }: { context: QueryInterface }) {
  await context.sequelize.query(`
    ALTER TABLE rag_metric_events
    ALTER COLUMN created_at DROP DEFAULT
  `);
}
