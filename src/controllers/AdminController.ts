/**
 * Admin Controller (Refactored)
 *
 * Thin HTTP adapter for admin dashboard APIs.
 */

import { Request, Response } from 'express';
import { AdminService } from '../services/AdminService';
import type { PaginatedResult } from '../skill/types';

export class AdminController {
  constructor(private adminService: AdminService) {}

  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const result = await this.adminService.getUsers(page, limit);
      res.json(result as PaginatedResult<any>);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get users' });
    }
  }

  async getSessions(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string | undefined;
      const result = await this.adminService.getSessions({
        status,
        page,
        limit,
      });
      res.json(result as PaginatedResult<any>);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get sessions' });
    }
  }

  async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const session_id = req.query.session_id as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;

      if (!session_id) {
        res.status(400).json({ error: 'session_id is required' });
        return;
      }

      const details = await this.adminService.getSessionDetails(session_id);
      if (!details) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      const messages = details.messages.slice((page - 1) * limit, page * limit);
      res.json({
        messages,
        total: details.messages.length,
        page,
        limit,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get messages' });
    }
  }

  async getAgents(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const result = await this.adminService.getAgents(page, limit);
      res.json(result as PaginatedResult<any>);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get agents' });
    }
  }

  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const stats = await this.adminService.getStatistics(days);
      res.json({ statistics: stats });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get statistics' });
    }
  }
}
