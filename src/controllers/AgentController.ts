/**
 * Agent Controller (Refactored)
 *
 * Thin HTTP adapter for agent workstation endpoints.
 */

import { Request, Response } from 'express';
import { AgentService } from '../services/AgentService';

export class AgentController {
  constructor(private agentService: AgentService) {}

  async getSessions(req: Request, res: Response): Promise<void> {
    try {
      const agentId = (req as any).user.agentId;
      const sessions = await this.agentService.getAgentSessions(agentId);
      res.json({ sessions });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get sessions' });
    }
  }

  async claimSession(req: Request, res: Response): Promise<void> {
    try {
      const agentId = (req as any).user.agentId;
      const { sessionId } = req.body;

      if (!sessionId) {
        res.status(400).json({ error: 'sessionId is required' });
        return;
      }

      const success = await this.agentService.claimSession(sessionId, agentId);
      if (success) {
        res.json({ message: 'Session claimed' });
      } else {
        res.status(404).json({ error: 'No available sessions or invalid session' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to claim session' });
    }
  }

  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const agentId = (req as any).user.agentId;
      const { sessionId, content } = req.body;

      if (!sessionId || !content) {
        res.status(400).json({ error: 'sessionId and content are required' });
        return;
      }

      const message = await this.agentService.sendAgentMessage(sessionId, agentId, content);
      res.json({ message: 'Sent', messageId: message.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to send message' });
    }
  }

  async closeSession(req: Request, res: Response): Promise<void> {
    try {
      const agentId = (req as any).user.agentId;
      const { sessionId } = req.body;

      if (!sessionId) {
        res.status(400).json({ error: 'sessionId is required' });
        return;
      }

      await this.agentService.closeSession(sessionId, agentId);
      res.json({ message: 'Closed' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to close session' });
    }
  }
}
