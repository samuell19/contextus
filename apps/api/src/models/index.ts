import type {
  AgentDto,
  KnowledgeSourceDto,
  MessageDto,
  OpenRouterKeyStatusDto,
  SessionDto,
  UserDto
} from '@multiagent/shared';
import {
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt
} from 'sequelize-typescript';

@Table({ tableName: 'users', underscored: true })
export class User extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({ type: DataType.STRING(255), unique: true, allowNull: false })
  declare email: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  declare passwordHash: string;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  @HasMany(() => Agent)
  declare agents?: Agent[];
}

@Table({ tableName: 'auth_sessions', underscored: true })
export class AuthSession extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  declare userId: string;

  @Column({ type: DataType.STRING(128), allowNull: false })
  declare refreshTokenHash: string;

  @Column({ type: DataType.STRING(512), allowNull: true })
  declare userAgent: string | null;

  @Column({ type: DataType.STRING(120), allowNull: true })
  declare ipAddress: string | null;

  @Column({ type: DataType.DATE, allowNull: false })
  declare expiresAt: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  declare revokedAt: Date | null;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  @BelongsTo(() => User)
  declare user?: User;
}

@Table({ tableName: 'user_api_credentials', underscored: true })
export class UserApiCredential extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false, unique: true })
  declare userId: string;

  @Column({ type: DataType.STRING(40), allowNull: false, defaultValue: 'openrouter' })
  declare provider: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  declare encryptedValue: string;

  @Column({ type: DataType.STRING(128), allowNull: false })
  declare iv: string;

  @Column({ type: DataType.STRING(128), allowNull: false })
  declare authTag: string;

  @Column({ type: DataType.STRING(4), allowNull: false })
  declare last4: string;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}

@Table({ tableName: 'agents', underscored: true })
export class Agent extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  declare userId: string;

  @Column({ type: DataType.STRING(80), allowNull: false })
  declare name: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare avatarPath: string | null;

  @Column({ type: DataType.TEXT, allowNull: false, defaultValue: '' })
  declare systemPrompt: string;

  @Column({ type: DataType.STRING(120), allowNull: true })
  declare defaultModelSlug: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare ragEnabled: boolean;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 5 })
  declare ragTopK: number;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  @HasMany(() => Session)
  declare sessions?: Session[];

  @HasMany(() => KnowledgeSource)
  declare knowledgeSources?: KnowledgeSource[];
}

@Table({ tableName: 'sessions', underscored: true })
export class Session extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  declare userId: string;

  @ForeignKey(() => Agent)
  @Column({ type: DataType.UUID, allowNull: false })
  declare agentId: string;

  @Column({ type: DataType.STRING(120), allowNull: false, defaultValue: 'Nova sessao' })
  declare title: string;

  @Column({ type: DataType.DATE, allowNull: true })
  declare lastMessageAt: Date | null;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  @BelongsTo(() => Agent)
  declare agent?: Agent;

  @HasMany(() => Message)
  declare messages?: Message[];
}

@Table({ tableName: 'messages', underscored: true })
export class Message extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Session)
  @Column({ type: DataType.UUID, allowNull: false })
  declare sessionId: string;

  @Column({ type: DataType.STRING(20), allowNull: false })
  declare role: 'system' | 'user' | 'assistant';

  @Column({ type: DataType.TEXT, allowNull: false })
  declare content: string;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  @BelongsTo(() => Session)
  declare session?: Session;
}

@Table({ tableName: 'memory_snapshots', underscored: true })
export class MemorySnapshot extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({ type: DataType.STRING(20), allowNull: false })
  declare ownerType: 'agent' | 'session';

  @Column({ type: DataType.UUID, allowNull: false })
  declare ownerId: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  declare summary: string;

  @ForeignKey(() => Message)
  @Column({ type: DataType.UUID, allowNull: true })
  declare updatedFromMessageId: string | null;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}

@Table({ tableName: 'knowledge_sources', underscored: true })
export class KnowledgeSource extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  declare userId: string;

  @ForeignKey(() => Agent)
  @Column({ type: DataType.UUID, allowNull: false })
  declare agentId: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  declare fileName: string;

  @Column({ type: DataType.STRING(120), allowNull: false })
  declare mimeType: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare sizeBytes: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare chunkCount: number;

  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: 'processing' })
  declare status: 'processing' | 'ready' | 'failed';

  @Column({ type: DataType.TEXT, allowNull: true })
  declare storagePath: string | null;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
}

export function toAgentDto(agent: Agent): AgentDto {
  return {
    id: agent.id,
    userId: agent.userId,
    name: agent.name,
    avatarUrl: agent.avatarPath ? `/api/agents/${agent.id}/avatar` : null,
    systemPrompt: agent.systemPrompt,
    defaultModelSlug: agent.defaultModelSlug,
    ragEnabled: agent.ragEnabled,
    ragTopK: agent.ragTopK,
    createdAt: agent.createdAt.toISOString(),
    updatedAt: agent.updatedAt.toISOString()
  };
}

export function toKnowledgeSourceDto(source: KnowledgeSource): KnowledgeSourceDto {
  return {
    id: source.id,
    userId: source.userId,
    agentId: source.agentId,
    fileName: source.fileName,
    mimeType: source.mimeType,
    sizeBytes: source.sizeBytes,
    chunkCount: source.chunkCount,
    status: source.status,
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString()
  };
}

export function toSessionDto(session: Session): SessionDto {
  return {
    id: session.id,
    userId: session.userId,
    agentId: session.agentId,
    title: session.title,
    lastMessageAt: session.lastMessageAt?.toISOString() ?? null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString()
  };
}

export function toMessageDto(message: Message): MessageDto {
  return {
    id: message.id,
    sessionId: message.sessionId,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt.toISOString()
  };
}

export function toCredentialStatusDto(credential: UserApiCredential | null): OpenRouterKeyStatusDto {
  return {
    configured: Boolean(credential),
    last4: credential?.last4 ?? null,
    source: credential ? 'user' : 'none'
  };
}
