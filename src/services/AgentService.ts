/**
 * Agent Service
 *
 * Handles agent management, session claiming, and agent messaging.
 */

import { AppDataSource } from '../config/database';
import { Agent } from '../models/Agent';
import { Session } from '../models/Session';
import { Message } from '../models/Message';
import { WeComService } from '../wecom/WeComService';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import type { Agent as AgentType, Session as SessionType, ConversationMessage } from '../skill/types';

export class AgentService {
  private wecomService: WeComService;

  constructor(
    private dataSource: typeof AppDataSource,
    wecomService: WeComService
  ) {
    this.wecomService = wecomService;
  }

  /**
   * Get all available agents (online and under capacity).
   */
  async getAvailableAgents(): Promise<AgentType[]> {
    const agentRepo = this.dataSource.getRepository(Agent);
    const agents = await agentRepo.find({
      where: { isOnline: true },
      order: { currentConcurrent: 'ASC' },
    });

    return agents.map(this.mapAgent);
  }

  /**
   * Claim an unassigned active session.
   */
  async claimSession(sessionId: string, agentId: string): Promise<boolean> {
    const sessionRepo = this.dataSource.getRepository(Session);
    const agentRepo = this.dataSource.getRepository(Agent);

    const session = await sessionRepo.findOne({
      where: { id: sessionId, status: 'active', agent: null },
    });
    if (!session) return false;

    const agent = await agentRepo.findOneBy({ id: agentId });
    if (!agent || agent.currentConcurrent >= agent.maxConcurrent) return false;

    session.agentId = agentId;
    session.status = 'transferred';
    agent.currentConcurrent += 1;

    await sessionRepo.save(session);
    await agentRepo.save(agent);

    return true;
  }

  /**
   * Get sessions assigned to an agent.
   */
  async getAgentSessions(agentId: string): Promise<SessionType[]> {
    const sessionRepo = this.dataSource.getRepository(Session);
    const sessions = await sessionRepo.find({
      where: { agentId, status: { $ne: 'closed' } },
      order: { lastMessageAt: 'DESC' },
    });

    return sessions.map(this.mapSession);
  }

  /**
   * Agent sends a message to user in session.
   */
  async sendAgentMessage(sessionId: string, agentId: string, content: string): Promise<ConversationMessage> {
    const sessionRepo = this.dataSource.getRepository(Session);
    const session = await sessionRepo.findOne({
      where: { sessionId },
      relations: ['user'],
    });

    if (!session || !session.user) {
      throw new Error('Session not found');
    }

    // Check agent is assigned to session
    if (session.agentId !== agentId) {
      throw new Error('Agent not assigned to this session');
    }

    const messageRepo = this.dataSource.getRepository(Message);
    const message = messageRepo.create({
      sessionId: session.id,
      messageId: uuidv4(),
      msgType: 'text',
      content,
      senderType: 'agent',
      senderId: agentId,
    });

    await messageRepo.save(message);

    // Send to WeCom
    try {
      await this.wecomService.sendMessage(session.user.wecomUserId, content, 'text');
    } catch (error) {
      console.error('Failed to send WeCom message:', error);
      // Continue anyway - message saved locally
    }

    return this.mapMessage(message);
  }

  /**
   * Close a session (by agent).
   */
  async closeSession(sessionId: string, agentId: string): Promise<void> {
    const sessionRepo = this.dataSource.getRepository(Session);
    const agentRepo = this.dataSource.getRepository(Agent);

    const session = await sessionRepo.findOne({ where: { sessionId } });
    const agent = await agentRepo.findOneBy({ id: agentId });

    if (!session || !agent) return;

    session.status = 'closed';
    session.closedAt = new Date();

    // Decrement agent concurrent count if session was assigned to them
    if (session.agentId === agentId && agent.currentConcurrent > 0) {
      agent.currentConcurrent -= 1;
    }

    await sessionRepo.save(session);
    await agentRepo.save(agent);
  }

  /**
   * Update agent online status.
   */
  async updateAgentStatus(agentId: string, isOnline: boolean): Promise<void> {
    const agentRepo = this.dataSource.getRepository(Agent);
    const agent = await agentRepo.findOneBy({ id: agentId });
    if (agent) {
      agent.isOnline = isOnline;
      await agentRepo.save(agent);
    }
  }

  /**
   * Authenticate agent by agentId and password.
   */
  async authenticate(agentId: string, password: string): Promise<AgentType | null> {
    const agentRepo = this.dataSource.getRepository(Agent);
    const agent = await agentRepo.findOneBy({ agentId });

    if (!agent || !agent.passwordHash) return null;

    const valid = await bcrypt.compare(password, agent.passwordHash);
    if (!valid) return null;

    return this.mapAgent(agent);
  }

  /**
   * Map ORM Agent entity to API type.
   */
  private mapAgent(agent: Agent): AgentType {
    return {
      id: agent.id,
      agentId: agent.agentId,
      name: agent.name,
      email: agent.email,
      role: agent.role as 'admin' | 'agent',
      isOnline: agent.isOnline,
      maxConcurrent: agent.maxConcurrent,
      currentConcurrent: agent.currentConcurrent,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };
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

  /**
   * Map ORM Message entity to API type.
   */
  private mapMessage(message: Message): ConversationMessage {
    return {
      id: message.id,
      sessionId: message.sessionId,
      role: message.senderType as any,
      content: message.content,
      msgType: message.msgType as any,
      mediaId: message.mediaId,
      aiModelUsed: message.aiModelUsed,
      tokenCount: message.tokenCount,
      createdAt: message.createdAt,
    };
  }
}
