import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { Message } from '../models/Message';
import { Agent } from '../models/Agent';
import { Statistics } from '../models/Statistics';

export class AdminController {
  async getUsers(req: Request, res: Response) {
    const { page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const [users, total] = await AppDataSource.getRepository(User).findAndCount({
      order: { createdAt: 'DESC' }, skip: offset, take: Number(limit),
    });
    res.json({ users, total, page: Number(page), limit: Number(limit) });
  }
  async getSessions(req: Request, res: Response) {
    const { status, page = 1, limit = 50 } = req.query;
    const query = AppDataSource.getRepository(Session).createQueryBuilder('session').leftJoinAndSelect('session.user', 'user').orderBy('session.lastMessageAt', 'DESC').skip((Number(page) - 1) * Number(limit)).take(Number(limit));
    if (status) query.andWhere('session.status = :status', { status });
    const [sessions, total] = await query.getManyAndCount();
    res.json({ sessions, total, page: Number(page), limit: Number(limit) });
  }
  async getMessages(req: Request, res: Response) {
    const { session_id, page = 1, limit = 100 } = req.query;
    const query = AppDataSource.getRepository(Message).createQueryBuilder('message').orderBy('message.createdAt', 'ASC').skip((Number(page) - 1) * Number(limit)).take(Number(limit));
    if (session_id) {
      const session = await AppDataSource.getRepository(Session).findOne({ where: { sessionId: session_id as string } });
      if (session) query.andWhere('message.sessionId = :sessionId', { sessionId: session.id });
    }
    const [messages, total] = await query.getManyAndCount();
    res.json({ messages, total, page: Number(page), limit: Number(limit) });
  }
  async getAgents(req: Request, res: Response) {
    const agents = await AppDataSource.getRepository(Agent).find();
    res.json({ agents });
  }
  async getStatistics(req: Request, res: Response) {
    const { days = 7 } = req.query;
    const stats = await AppDataSource.getRepository(Statistics).find({ order: { statDate: 'DESC' }, take: Number(days) * 10 });
    res.json({ statistics: stats });
  }
}
