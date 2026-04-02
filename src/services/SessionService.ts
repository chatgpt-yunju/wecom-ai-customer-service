/**
 * Session Service
 *
 * Handles session lifecycle management: create, retrieve, close, transfer.
 */

import { AppDataSource } from '../config/database';
import { Session } from '../models/Session';
import { v4 as uuidv4 } from 'uuid';
import type { Session as SessionType, SessionWithMessages } from '../skill/types';

export class SessionService {
  constructor(private dataSource: typeof AppDataSource) {}

  /**
   * Create a new session for a user.
   */
  async createSession(userId: string, metadata?: Record<string, any>): Promise<string> {
    const sessionRepo = this.dataSource.getRepository(Session);
    const sessionId = uuidv4();

    const session = sessionRepo.create({
      userId,
      sessionId,
      status: 'active',
      metadata,
      createdAt: new Date(),
      lastMessageAt: new Date(),
    });

    await sessionRepo.save(session);
    return sessionId;
  }

  /**
   * Get session by internal database ID.
   */
  async getSession(sessionId: string): Promise<SessionType | null> {
    const sessionRepo = this.dataSource.getRepository(Session);
    const session = await sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) return null;

    return this.mapSession(session);
  }

  /**
   * Get session by external UUID.
   */
  async getSessionByUuid(sessionUuid: string): Promise<SessionType | null> {
    const sessionRepo = this.dataSource.getRepository(Session);
    const session = await sessionRepo.findOne({ where: { sessionId: sessionUuid } });
    if (!session) return null;

    return this.mapSession(session);
  }

  /**
   * Get session with all messages.
   */
  async getSessionWithMessages(sessionId: string): Promise<SessionWithMessages | null> {
    const sessionRepo = this.dataSource.getRepository(Session);
    const session = await sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['user'],
    });

    if (!session) return null;

    const result = this.mapSession(session) as SessionWithMessages;
    result.messages = []; // Will be populated by MessageService
    return result;
  }

  /**
   * Get active sessions, optionally filtered by user.
   */
  async getActiveSessions(userId?: string): Promise<SessionType[]> {
    const sessionRepo = this.dataSource.getRepository(Session);
    const where: any = { status: 'active' };
    if (userId) where.userId = userId;

    const sessions = await sessionRepo.find({
      where,
      order: { lastMessageAt: 'DESC' },
    });

    return sessions.map(this.mapSession);
  }

  /**
   * Close a session.
   */
  async closeSession(sessionId: string): Promise<void> {
    const sessionRepo = this.dataSource.getRepository(Session);
    const session = await sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) return;

    session.status = 'closed';
    session.closedAt = new Date();
    await sessionRepo.save(session);
  }

  /**
   * Transfer session to an agent.
   */
  async transferSession(sessionId: string, agentId: string): Promise<void> {
    const sessionRepo = this.dataSource.getRepository(Session);
    const session = await sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) return;

    session.agentId = agentId;
    session.status = 'transferred';
    await sessionRepo.save(session);
  }

  /**
   * Update last message timestamp.
   */
  async updateLastMessage(sessionId: string): Promise<void> {
    const sessionRepo = this.dataSource.getRepository(Session);
    await sessionRepo.update(sessionId, { lastMessageAt: new Date() });
  }

  /**
   * Map ORM Session entity to API type.
   */
  private mapSession(session: Session): SessionType {
    return {
      id: session.id,
      sessionId: session.sessionId,
      userId: session.userId,
      agentId: session.agentId || undefined,
      status: session.status as 'active' | 'closed' | 'transferred',
      createdAt: session.createdAt,
      closedAt: session.closedAt || undefined,
      lastMessageAt: session.lastMessageAt || undefined,
      metadata: session.metadata || undefined,
    };
  }
}
