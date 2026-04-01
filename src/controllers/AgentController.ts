import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Session } from '../models/Session';
import { Message } from '../models/Message';
import { Agent } from '../models/Agent';
import { v4 as uuidv4 } from 'uuid';
import { WeComService } from '../wecom/WeComService';

const wecomConfig = { corpId: process.env.WECOM_CORP_ID || '', corpSecret: process.env.WECOM_CORP_SECRET || '', token: process.env.WECOM_TOKEN || '', encodingAESKey: process.env.WECOM_ENCODING_AES_KEY || '', agentId: parseInt(process.env.WECOM_AGENT_ID || '0'), apiHost: process.env.WECOM_API_HOST || 'https://qyapi.weixin.qq.com/cgi-bin' };
const wecomService = new WeComService(wecomConfig);

export class AgentController {
  async getSessions(req: Request, res: Response) {
    const agentId = (req as any).user.agentId;
    const sessions = await AppDataSource.getRepository(Session).find({ where: { agentId }, relations: ['user'], order: { lastMessageAt: 'DESC' } });
    res.json({ sessions });
  }
  async claimSession(req: Request, res: Response) {
    const agentId = (req as any).user.agentId;
    const agent = await AppDataSource.getRepository(Agent).findOneBy({ id: agentId });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    const session = await AppDataSource.getRepository(Session).findOne({ where: { status: 'active', agent: null }, order: { lastMessageAt: 'DESC' } });
    if (!session) return res.status(404).json({ error: 'No available sessions' });
    session.agent = agent;
    await AppDataSource.getRepository(Session).save(session);
    res.json({ session, message: 'Session claimed' });
  }
  async sendMessage(req: Request, res: Response) {
    try {
      const { sessionId, content } = req.body;
      const agent = (req as any).user;
      const sessionRepo = AppDataSource.getRepository(Session);
      const session = await sessionRepo.findOne({ where: { sessionId }, relations: ['user'] });
      if (!session || !session.user) return res.status(404).json({ error: 'Session not found' });
      const messageRepo = AppDataSource.getRepository(Message);
      const message = messageRepo.create({ sessionId: session.id, messageId: uuidv4(), msgType: 'text', content, senderType: 'agent', senderId: agent.agentId });
      await messageRepo.save(message);
      await wecomService.sendMessage(session.user.wecomUserId, content, 'text');
      res.json({ message: 'Sent' });
    } catch (error) {
      res.status(500).json({ error: 'Failed' });
    }
  }
  async closeSession(req: Request, res: Response) {
    const { sessionId } = req.body;
    const session = await AppDataSource.getRepository(Session).findOne({ where: { sessionId } });
    if (!session) return res.status(404).json({ error: 'Not found' });
    session.status = 'closed';
    session.closedAt = new Date();
    await AppDataSource.getRepository(Session).save(session);
    res.json({ message: 'Closed' });
  }
}
