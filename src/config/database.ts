import { DataSource } from 'typeorm';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { Message } from '../models/Message';
import { Agent } from '../models/Agent';
import { KnowledgeBase } from '../models/KnowledgeBase';
import { KbChunk } from '../models/KbChunk';
import { KbEmbedding } from '../models/KbEmbedding';
import { Config } from '../models/Config';
import { Statistics } from '../models/Statistics';

const DB_HOST = process.env.DATABASE_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DATABASE_PORT || '5432');
const DB_USERNAME = process.env.DATABASE_USERNAME || 'postgres';
const DB_PASSWORD = process.env.DATABASE_PASSWORD || '';
const DB_NAME = process.env.DATABASE_NAME || 'wecom_ai';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: DB_HOST,
  port: DB_PORT,
  username: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_NAME,
  entities: [User, Session, Message, Agent, KnowledgeBase, KbChunk, KbEmbedding, Config, Statistics],
  synchronize: false, // Use migrations instead
  logging: process.env.NODE_ENV === 'development',
  extra: {
    connectionLimit: process.env.NODE_ENV === 'production' ? 20 : 5,
  },
});

AppDataSource.initialize()
  .then(() => console.log('✅ Database connected'))
  .catch(err => console.error('❌ Database connection failed:', err));
