import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

export async function up({ context }: { context: QueryInterface }) {
  await context.addColumn('messages', 'metadata', {
    type: DataTypes.JSONB,
    allowNull: true
  });
}

export async function down({ context }: { context: QueryInterface }) {
  await context.removeColumn('messages', 'metadata');
}
