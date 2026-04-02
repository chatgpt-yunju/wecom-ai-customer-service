/**
 * Message API Controller
 *
 * External API for sending messages to WeCom users.
 * Requires API key authentication.
 */

import { Request, Response } from 'express';
import { WeComService } from '../wecom/WeComService';
import { AppDataSource } from '../config/database';
import { Config } from '../models/Config';

export class MessageApiController {
  private wecomService: WeComService;
  private apiKey: string;

  constructor(wecomService: WeComService) {
    this.wecomService = wecomService;
    this.apiKey = process.env.API_KEY || '';
  }

  /**
   * Send single message to a user.
   */
  async sendPrivateMessage(req: Request, res: Response): Promise<void> {
    // Check API key
    const providedKey = req.headers['x-api-key'] as string;
    if (providedKey !== this.apiKey) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    try {
      const { userId, content, msgType = 'text', mediaId } = req.body;
      if (!userId || !content) {
        res.status(400).json({ error: 'userId and content are required' });
        return;
      }

      const success = await this.wecomService.sendMessage(userId, content, msgType, mediaId);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: 'Failed to send message' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to send message' });
    }
  }

  /**
   * Send batch messages to multiple users.
   */
  async sendBatchMessages(req: Request, res: Response): Promise<void> {
    const providedKey = req.headers['x-api-key'] as string;
    if (providedKey !== this.apiKey) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    try {
      const { userIds, content, msgType = 'text' } = req.body;
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || !content) {
        res.status(400).json({ error: 'userIds (array) and content are required' });
        return;
      }

      const results = [];
      for (const userId of userIds) {
        try {
          const success = await this.wecomService.sendMessage(userId, content, msgType);
          results.push({ userId, success });
        } catch (error) {
          results.push({ userId, success: false, error: String(error) });
        }
      }

      res.json({ results });
    } catch (error) {
      res.status(500).json({ error: 'Failed to send batch messages' });
    }
  }

  /**
   * Get user information.
   */
  async getUserInfo(req: Request, res: Response): Promise<void> {
    const { userId } = req.params as { userId: string };
    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    try {
      const userInfo = await this.wecomService.getUser(userId);
      res.json(userInfo);
    } catch (error: any) {
      if (error.response?.status === 420) {
        res.status(404).json({ error: 'User not found or access denied' });
      } else {
        res.status(500).json({ error: 'Failed to get user info' });
      }
    }
  }

  /**
   * Health check endpoint.
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    const healthy = await this.wecomService.healthCheck();
    res.json({
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'wecom-api',
    });
  }
}
