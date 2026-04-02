/**
 * Auth Controller (Refactored)
 *
 * Thin HTTP adapter for authentication endpoints.
 */

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AgentService } from '../services/AgentService';

export class AuthController {
  constructor(private agentService: AgentService) {}

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { agentId, password } = req.body;
      if (!agentId || !password) {
        res.status(400).json({ error: 'agentId and password required' });
        return;
      }

      const agent = await this.agentService.authenticate(agentId, password);
      if (!agent) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const token = jwt.sign(
        { agentId: agent.id, role: agent.role },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.json({
        token,
        agent: {
          id: agent.id,
          agentId: agent.agentId,
          name: agent.name,
          role: agent.role,
        },
      });
    } catch (error) {
      res.status(500).json({ error: 'Login failed' });
    }
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      const agent = (req as any).user;

      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: 'currentPassword and newPassword required' });
        return;
      }

      const agentRecord = await this.agentService['dataSource'].getRepository(require('../models/Agent').Agent).findOneBy({
        id: agent.agentId,
      });

      if (!agentRecord) {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }

      const valid = await bcrypt.compare(currentPassword, agentRecord.passwordHash);
      if (!valid) {
        res.status(401).json({ error: 'Current password incorrect' });
        return;
      }

      const hash = await bcrypt.hash(newPassword, 10);
      agentRecord.passwordHash = hash;
      await this.agentService['dataSource'].getRepository(require('../models/Agent').Agent).save(agentRecord);

      res.json({ message: 'Password updated' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
}
