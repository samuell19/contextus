import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

export async function up({ context }: { context: QueryInterface }) {
  await context.createTable('users', {
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  });

  await context.createTable('auth_sessions', {
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE'
    },
    refresh_token_hash: { type: DataTypes.STRING(128), allowNull: false },
    user_agent: { type: DataTypes.STRING(512), allowNull: true },
    ip_address: { type: DataTypes.STRING(120), allowNull: true },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    revoked_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  });

  await context.createTable('user_api_credentials', {
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE'
    },
    provider: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'openrouter' },
    encrypted_value: { type: DataTypes.TEXT, allowNull: false },
    iv: { type: DataTypes.STRING(128), allowNull: false },
    auth_tag: { type: DataTypes.STRING(128), allowNull: false },
    last4: { type: DataTypes.STRING(4), allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  });

  await context.createTable('agents', {
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE'
    },
    name: { type: DataTypes.STRING(80), allowNull: false },
    avatar_path: { type: DataTypes.TEXT, allowNull: true },
    system_prompt: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    default_model_slug: { type: DataTypes.STRING(120), allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  });

  await context.createTable('sessions', {
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
    title: { type: DataTypes.STRING(120), allowNull: false, defaultValue: 'Nova sessao' },
    last_message_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  });

  await context.createTable('messages', {
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    session_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'sessions', key: 'id' },
      onDelete: 'CASCADE'
    },
    role: { type: DataTypes.STRING(20), allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  });

  await context.createTable('memory_snapshots', {
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    owner_type: { type: DataTypes.STRING(20), allowNull: false },
    owner_id: { type: DataTypes.UUID, allowNull: false },
    summary: { type: DataTypes.TEXT, allowNull: false },
    updated_from_message_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'messages', key: 'id' },
      onDelete: 'SET NULL'
    },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  });

  await context.addIndex('sessions', ['user_id', 'agent_id']);
  await context.addIndex('messages', ['session_id', 'created_at']);
  await context.addIndex('memory_snapshots', ['owner_type', 'owner_id'], {
    unique: true,
    name: 'memory_snapshots_owner_unique'
  });
}

export async function down({ context }: { context: QueryInterface }) {
  await context.dropTable('memory_snapshots');
  await context.dropTable('messages');
  await context.dropTable('sessions');
  await context.dropTable('agents');
  await context.dropTable('user_api_credentials');
  await context.dropTable('auth_sessions');
  await context.dropTable('users');
}
