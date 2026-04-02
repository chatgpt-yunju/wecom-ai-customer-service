/**
 * Session Service Unit Test
 *
 * Tests for session CRUD operations.
 * Uses an in-memory SQLite database for isolation.
 */

import { DataSource } from 'typeorm';
import SQLite from 'better-sqlite3';
import { SessionService } from '../src/services/SessionService';
import { Session } from '../src/models/Session';
import { User } from '../src/models/User';

// Mock AppDataSource with SQLite in-memory
let dataSource: DataSource;

beforeAll(async () => {
  dataSource = new DataSource({
    type: 'sqlite',
    database: ':memory:',
    entities: [User, Session],
    synchronize: true,
    logging: false,
  });
  await dataSource.initialize();
});

afterAll(async () => {
  await dataSource.destroy();
});

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(() => {
    service = new SessionService(dataSource);
    // Clear tables
    dataSource.getRepository(Session).clear();
    dataSource.getRepository(User).clear();
  });

  test('should create a new session', async () => {
    const userId = 'user-123';
    const sessionId = await service.createSession(userId);

    expect(sessionId).toBeDefined();
    expect(typeof sessionId).toBe('string');

    const session = await service.getSessionByUuid(sessionId);
    expect(session).not.toBeNull();
    expect(session!.userId).toBe(userId);
    expect(session!.status).toBe('active');
  });

  test('should retrieve session by UUID', async () => {
    const userId = 'user-456';
    const sessionId = await service.createSession(userId);

    const session = await service.getSessionByUuid(sessionId);
    expect(session).not.toBeNull();
    expect(session!.sessionId).toBe(sessionId);
    expect(session!.userId).toBe(userId);
  });

  test('should return null for non-existent session', async () => {
    const session = await service.getSessionByUuid('non-existent');
    expect(session).toBeNull();
  });

  test('should get active sessions for a user', async () => {
    const userId = 'user-789';
    const sessionId1 = await service.createSession(userId);
    const sessionId2 = await service.createSession(userId);

    const sessions = await service.getActiveSessions(userId);
    expect(sessions.length).toBe(2);
    expect(sessions.map(s => s.sessionId)).toContain(sessionId1);
    expect(sessions.map(s => s.sessionId)).toContain(sessionId2);
  });

  test('should close a session', async () => {
    const userId = 'user-close';
    const sessionId = await service.createSession(userId);

    await service.closeSession(sessionId);

    const session = await service.getSessionByUuid(sessionId);
    expect(session!.status).toBe('closed');
    expect(session!.closedAt).toBeDefined();
  });

  test('should transfer a session to an agent', async () => {
    const userId = 'user-transfer';
    const sessionId = await service.createSession(userId);

    await service.transferSession(sessionId, 'agent-1');

    const session = await service.getSessionByUuid(sessionId);
    expect(session!.agentId).toBe('agent-1');
    expect(session!.status).toBe('transferred');
  });

  test('should update last message timestamp', async () => {
    const userId = 'user-update';
    const sessionId = await service.createSession(userId);

    // Update should not throw
    await service.updateLastMessage(sessionId);

    const session = await service.getSessionByUuid(sessionId);
    expect(session!.lastMessageAt).toBeDefined();
  });
});
