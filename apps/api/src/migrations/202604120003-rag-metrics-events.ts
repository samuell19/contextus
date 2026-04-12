import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

export async function up({ context }: { context: QueryInterface }) {
  await context.createTable('rag_metric_events', {
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    event_type: { type: DataTypes.STRING(40), allowNull: false },
    value_number: { type: DataTypes.DOUBLE, allowNull: true },
    payload: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  });

  await context.addIndex('rag_metric_events', ['event_type', 'created_at'], {
    name: 'rag_metric_events_type_created_at_idx'
  });

  await context.addIndex('rag_metric_events', ['created_at'], {
    name: 'rag_metric_events_created_at_idx'
  });
}

export async function down({ context }: { context: QueryInterface }) {
  await context.removeIndex('rag_metric_events', 'rag_metric_events_created_at_idx');
  await context.removeIndex('rag_metric_events', 'rag_metric_events_type_created_at_idx');
  await context.dropTable('rag_metric_events');
}
