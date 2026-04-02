/**
 * AI Controller (Refactored)
 *
 * Thin HTTP adapter for AI chat endpoint.
 * Delegates to message service and AI service.
 */

import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { AIService } from '../ai/AIService';
import { MessageService } from '../services/MessageService';
import { SessionService } from '../services/SessionService';
import { UserService } from '../services/UserService';

export class AIController {
  constructor(
    private aiService: AIService,
    private messageService: MessageService,
    private sessionService: SessionService,
    private userService: UserService
  ) {}

  async chat(req: Request, res: Response): Promise<void> {
    try {
      const { message, session_id } = req.body;
      if (!message) {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      // Get or create user (use provided ID or default)
      const userId = (req as any).userId || 'web_user';
      const user = await this.userService.getOrCreateUser(userId);

      // Get or create session
      let sessionId = session_id;
      if (!sessionId) {
        sessionId = await this.sessionService.createSession(user.id);
      } else {
        const session = await this.sessionService.getSessionByUuid(sessionId);
        if (!session) {
          sessionId = await this.sessionService.createSession(user.id);
        }
      }

      // Save user message
      await this.messageService.saveMessage({
        sessionId,
        content: message,
        role: 'user',
        senderId: user.wecomUserId,
        msgType: 'text',
      });

      // Get conversation history
      const history = await this.messageService.getHistory(sessionId, 20);

      // Format for AI
      const aiMessages = history.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      // Generate AI response
      const aiReply = await this.aiService.chat(aiMessages);

      // Save AI response
      await this.messageService.saveMessage({
        sessionId,
        content: aiReply,
        role: 'ai',
        senderId: 'ai',
        msgType: 'text',
      });

      res.json({ session_id: sessionId, reply: aiReply });
    } catch (error: any) {
      console.error('Chat error:', error);
      res.status(500).json({ error: 'Failed to get AI response' });
    }
  }
}
