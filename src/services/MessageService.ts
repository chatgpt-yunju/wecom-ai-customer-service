/**
 * Message Service
 *
 * Handles message persistence and retrieval.
 */

import { AppDataSource } from '../config/database';
import { Message } from '../models/Message';
import { v4 as uuidv4 } from 'uuid';
import type { ConversationMessage, SenderType, MessageType } from '../skill/types';

export class MessageService {
  constructor(private dataSource: typeof AppDataSource) {}

  /**
   * Save a new message.
   */
  async saveMessage(params: {
    sessionId: string;
    content: string;
    role: SenderType;
    senderId: string;
    msgType: MessageType;
    mediaId?: string;
    aiModelUsed?: string;
    tokenCount?: number;
  }): Promise<ConversationMessage> {
    const messageRepo = this.dataSource.getRepository(Message);
    const message = messageRepo.create({
      sessionId: params.sessionId,
      messageId: uuidv4(),
      msgType: params.msgType,
      content: params.content,
      senderType: params.role,
      senderId: params.senderId,
      mediaId: params.mediaId,
      aiModelUsed: params.aiModelUsed,
      tokenCount: params.tokenCount,
      createdAt: new Date(),
    });

    await messageRepo.save(message);

    return this.mapMessage(message);
  }

  /**
   * Get all messages for a session.
   */
  async getBySession(sessionId: string): Promise<ConversationMessage[]> {
    const messageRepo = this.dataSource.getRepository(Message);
    const session = await this.dataSource.getRepository(require('../models/Session').Session).findOne({
      where: { id: sessionId },
    });

    if (!session) return [];

    const messages = await messageRepo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });

    return messages.map(this.mapMessage);
  }

  /**
   * Get conversation history (X most recent messages).
   */
  async getHistory(sessionId: string, limit: number): Promise<ConversationMessage[]> {
    const messageRepo = this.dataSource.getRepository(Message);
    const messages = await messageRepo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
      take: limit,
    });

    return messages.map(this.mapMessage);
  }

  /**
   * Get most recent messages across all sessions (for stats/debugging).
   */
  async getRecent(limit: number): Promise<ConversationMessage[]> {
    const messageRepo = this.dataSource.getRepository(Message);
    const messages = await messageRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return messages.map(this.mapMessage);
  }

  /**
   * Map ORM Message entity to API type.
   */
  private mapMessage(message: Message): ConversationMessage {
    return {
      id: message.id,
      sessionId: message.sessionId,
      role: message.senderType as SenderType,
      content: message.content,
      msgType: message.msgType as MessageType,
      mediaId: message.mediaId,
      aiModelUsed: message.aiModelUsed,
      tokenCount: message.tokenCount,
      createdAt: message.createdAt,
    };
  }
}
