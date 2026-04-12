import { Sequelize } from 'sequelize-typescript';

import {
  Agent,
  AuthSession,
  KnowledgeSource,
  MemorySnapshot,
  Message,
  Session,
  User,
  UserApiCredential
} from '../models/index.js';
import { env } from './env.js';

export const sequelize = new Sequelize(env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  models: [User, AuthSession, UserApiCredential, Agent, Session, Message, MemorySnapshot, KnowledgeSource]
});
