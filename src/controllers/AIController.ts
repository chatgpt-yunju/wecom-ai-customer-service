import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { Message } from '../models/Message';
import { AIService } from '../ai/AIService';

// 使用https://api.yunjunet.cn
const aiService = new AIService({
  apiBaseUrl: process.env.AI_API_BASE_URL || 'https://api.yunjunet.cn/v1',
  apiKey: process.env.AI_API_KEY || '',
  model: process.env.AI_MODEL || 'claude-3-opus-20240229',
  maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4000'),
  temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
});

export class AIController {
  async chat(req: Request, res: Response) {
    try {
      const { message, session_id } = req.body;
      if (!message) return res.status(400).json({ error: 'Message is required' });

      const manager = AppDataSource.manager;
      let user = await manager.getRepository(User).findOne({
        where: { wecomUserId: (req as any).userId || 'web_user' },
      });

      if (!user) {
        user = manager.getRepository(User).create({
          wecomUserId: (req as any).userId || 'web_user',
          name: 'Web User',
        });
        await manager.getRepository(User).save(user);
      }

      let session: Session | null = null;
      if (session_id) {
        session = await manager.getRepository(Session).findOne({
          where: { sessionId: session_id },
        });
      }

      if (!session) {
        const newSessionId = uuidv4();
        session = manager.getRepository(Session).create({
          userId: user.id,
          sessionId: newSessionId,
          status: 'active',
        });
        await manager.getRepository(Session).save(session);
      }

      // Save user message
      const userMsg = manager.getRepository(Message).create({
        sessionId: session.id,
        messageId: uuidv4(),
        msgType: 'text',
        content: message,
        senderType: 'user',
        senderId: user.wecomUserId,
      });
      await manager.getRepository(Message).save(userMsg);

      // Get history
      const history = await manager.getRepository(Message).find({
        where: { sessionId: session.id },
        order: { createdAt: 'ASC' },
        take: 20,
      });

      const messages = history.map(m => ({
        role: m.senderType === 'user' ? 'user' : 'assistant',
        content: m.content || '',
      }));

      const aiReply = await aiService.chat(messages);

      // Save AI response
      const aiMsg = manager.getRepository(Message).create({
        sessionId: session.id,
        messageId: uuidv4(),
        msgType: 'text',
        content: aiReply,
        senderType: 'ai',
      });
      await manager.getRepository(Message).save(aiMsg);

      res.json({ session_id: session.sessionId, reply: aiReply });
    } catch (error: any) {
      console.error('Chat error:', error);
      res.status(500).json({ error: 'Failed to get AI response' });
    }
  }
}
