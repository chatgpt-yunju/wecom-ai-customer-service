import { Request, Response } from 'express';
import { WeComService } from '../wecom/WeComService';
import { AIService } from '../ai/AIService';
import { AppDataSource } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { WeComCrypto } from '../wecom/Crypto';

const wecomConfig = {
  corpId: process.env.WECOM_CORP_ID || '',
  corpSecret: process.env.WECOM_CORP_SECRET || '',
  token: process.env.WECOM_TOKEN || '',
  encodingAESKey: process.env.WECOM_ENCODING_AES_KEY || '',
  agentId: parseInt(process.env.WECOM_AGENT_ID || '0'),
  apiHost: process.env.WECOM_API_HOST || 'https://qyapi.weixin.qq.com/cgi-bin',
};

const wecomService = new WeComService(wecomConfig);
const crypto = new WeComCrypto(wecomConfig.token, wecomConfig.encodingAESKey);

// 使用https://api.yunjunet.cn
const aiService = new AIService({
  apiBaseUrl: process.env.AI_API_BASE_URL || 'https://api.yunjunet.cn/v1',
  apiKey: process.env.AI_API_KEY || '',
  model: process.env.AI_MODEL || 'claude-3-opus-20240229',
  maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4000'),
  temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
});

export class WeComController {
  async callback(req: Request, res: Response) {
    try {
      const { msg_signature, timestamp, nonce, echostr } = req.query as any;

      if (echostr) {
        const token = wecomConfig.token;
        const sortStr = [token, timestamp, nonce, echostr].sort().join('');
        const sha1 = require('crypto').createHash('sha1').update(sortStr).digest('hex');
        return res.send(echostr);
      }

      const encryptedData = req.body.xml?.Encrypt;
      if (!encryptedData) return res.status(400).send('Invalid request');

      const decrypted = crypto.decodeMessage(msg_signature, timestamp, nonce, encryptedData);

      const fromUser = decrypted?.FromUserName;
      const content = decrypted?.Content;

      // Get or create user
      let user = await AppDataSource.getRepository(require('./models/User').User).findOne({
        where: { wecomUserId: fromUser },
      });

      if (!user) {
        try {
          const userInfo = await wecomService.getUser(fromUser);
          const User = require('./models/User').User;
          user = AppDataSource.getRepository(User).create({
            wecomUserId: fromUser,
            name: userInfo.name || fromUser,
            avatarUrl: userInfo.avatar || null,
          });
          await AppDataSource.getRepository(User).save(user);
        } catch (e) {
          console.error('Failed to get user info:', e);
          const User = require('./models/User').User;
          user = AppDataSource.getRepository(User).create({
            wecomUserId: fromUser,
            name: 'WeChat User',
          });
          await AppDataSource.getRepository(User).save(user);
        }
      }

      // Find or create session
      let session = await AppDataSource.getRepository(require('./models/Session').Session).findOne({
        where: { userId: user.id, status: 'active' },
      });

      if (!session) {
        const sessionId = uuidv4();
        const Session = require('./models/Session').Session;
        session = AppDataSource.getRepository(Session).create({
          userId: user.id,
          sessionId,
          status: 'active',
        });
        await AppDataSource.getRepository(Session).save(session);
      }

      // Save user message
      const Message = require('./models/Message').Message;
      const userMsg = AppDataSource.getRepository(Message).create({
        sessionId: session.id,
        messageId: uuidv4(),
        msgType: 'text',
        content,
        senderType: 'user',
        senderId: fromUser,
      });
      await AppDataSource.getRepository(Message).save(userMsg);

      // Generate AI reply
      try {
        const history = await AppDataSource.getRepository(Message).find({
          where: { sessionId: session.id },
          order: { createdAt: 'ASC' },
          take: 10,
        });

        const messages = history.map(m => ({
          role: m.senderType === 'user' ? 'user' : 'assistant',
          content: m.content || '',
        }));

        const aiReply = await aiService.chat(messages);

        const aiMsg = AppDataSource.getRepository(Message).create({
          sessionId: session.id,
          messageId: uuidv4(),
          msgType: 'text',
          content: aiReply,
          senderType: 'ai',
        });
        await AppDataSource.getRepository(Message).save(aiMsg);

        await wecomService.sendMessage(fromUser, aiReply);
        return res.send('<xml><return_code>0</return_code><return_msg>OK</return_msg></xml>');
      } catch (aiError) {
        console.error('AI error:', aiError);
        return res.send('<xml><return_code>0</return_code><return_msg>OK</return_msg></xml>');
      }

    } catch (error) {
      console.error('WeCom callback error:', error);
      return res.status(500).send('Internal Server Error');
    }
  }
}
