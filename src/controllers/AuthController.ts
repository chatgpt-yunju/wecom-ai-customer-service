import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { Agent } from '../models/Agent';

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const { agentId, password } = req.body;
      if (!agentId || !password) {
        return res.status(400).json({ error: 'agentId and password required' });
      }

      const agent = await AppDataSource.getRepository(Agent).findOneBy({ agentId });
      if (!agent || !agent.passwordHash) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const valid = await bcrypt.compare(password, agent.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { agentId: agent.id, role: agent.role },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.json({ token, agent: { id: agent.id, agentId: agent.agentId, name: agent.name, role: agent.role } });
    } catch (error) {
      res.status(500).json({ error: 'Login failed' });
    }
  }

  async changePassword(req: Request, res: Response) {
    try {
      const { currentPassword, newPassword } = req.body;
      const agent = (req as any).user;
      const agentRepo = AppDataSource.getRepository(Agent);
      const current = await agentRepo.findOneBy({ id: agent.agentId });

      if (!current || !current.passwordHash) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      const valid = await bcrypt.compare(currentPassword, current.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: 'Current password incorrect' });
      }

      const hash = await bcrypt.hash(newPassword, 10);
      current.passwordHash = hash;
      await agentRepo.save(current);
      res.json({ message: 'Password updated' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
}
