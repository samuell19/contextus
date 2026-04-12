import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

export async function up({ context }: { context: QueryInterface }) {
  await context.sequelize.query('CREATE EXTENSION IF NOT EXISTS vector');

  await context.addColumn('agents', 'rag_enabled', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  });

  await context.addColumn('agents', 'rag_top_k', {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5
  });

  await context.createTable('knowledge_sources', {
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE'
    },
    agent_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'agents', key: 'id' },
      onDelete: 'CASCADE'
    },
    file_name: { type: DataTypes.STRING(255), allowNull: false },
    mime_type: { type: DataTypes.STRING(120), allowNull: false },
    size_bytes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    chunk_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'processing' },
    storage_path: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  });

  await context.addIndex('knowledge_sources', ['user_id', 'agent_id']);

  await context.sequelize.query(`
    CREATE TABLE IF NOT EXISTS knowledge_chunks (
      id uuid PRIMARY KEY,
      source_id uuid NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      chunk_index integer NOT NULL,
      content text NOT NULL,
      embedding vector(1536) NOT NULL,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await context.sequelize.query(
    'CREATE INDEX IF NOT EXISTS knowledge_chunks_scope_idx ON knowledge_chunks (user_id, agent_id, source_id)'
  );
}

export async function down({ context }: { context: QueryInterface }) {
  await context.sequelize.query('DROP TABLE IF EXISTS knowledge_chunks');
  await context.removeIndex('knowledge_sources', ['user_id', 'agent_id']);
  await context.dropTable('knowledge_sources');
  await context.removeColumn('agents', 'rag_top_k');
  await context.removeColumn('agents', 'rag_enabled');
}
