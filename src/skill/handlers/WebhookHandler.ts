/**
 * Webhook Handler for WeCom Callbacks
 *
 * Processes incoming WeCom messages and routes them through the skill's
 * message pipeline.
 */

import { Request, Response } from 'express';
import { WeComCrypto } from '../../wecom/Crypto';
import { WeComService } from '../../wecom/WeComService';
import type { SkillConfig, MessageEvent } from '../types';
import type { IOpenClawSkill } from '../interfaces/IOpenClawSkill';

export class WebhookHandler {
  private wecomService: WeComService;
  private config: SkillConfig;

  constructor(skill: IOpenClawSkill) {
    // Get services and config from skill
    const skillAny = skill as any;
    if (!skillAny.getServices) {
      throw new Error('Skill must provide getServices() method');
    }
    const services = skillAny.getServices() as any;
    this.wecomService = services.wecom as WeComService;
    if (!this.wecomService) {
      throw new Error('Skill services must include wecom');
    }
    if (!skillAny.getConfig) {
      throw new Error('Skill must provide getConfig() method');
    }
    this.config = skillAny.getConfig();
  }

  /**
   * Handle WeCom callback request.
   */
  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { msg_signature, timestamp, nonce, echostr } = req.query as any;
      const config: SkillConfig = (this.skill as any).config; // Get config from skill

      const crypto = new WeComCrypto(config.wecom.token, config.wecom.encodingAESKey);

      // Verification challenge (first call from WeCom)
      if (echostr) {
        const token = config.wecom.token;
        const sortStr = [token, timestamp, nonce, echostr].sort().join('');
        const sha1 = require('crypto').createHash('sha1').update(sortStr).digest('hex');
        if (sha1 === msg_signature) {
          return res.send(echostr);
        } else {
          return res.status(403).send('Invalid signature');
        }
      }

      // Encrypted message
      const encryptedData = req.body.xml?.Encrypt;
      if (!encryptedData) {
        return res.status(400).send('Missing encrypt field');
      }

      const decrypted = crypto.decodeMessage(msg_signature, timestamp, nonce, encryptedData);
      const fromUser = decrypted?.FromUserName;
      const content = decrypted?.Content;
      const msgType = decrypted?.MsgType || 'text';

      if (!fromUser || !content) {
        return res.status(400).send('Invalid message');
      }

      // Build message event
      const event: MessageEvent = {
        type: this.mapMessageType(msgType),
        content,
        userId: fromUser,
        timestamp: new Date(),
      };

      // Delegate to skill
      const response = await this.skill.onMessageReceived(event);

      // Send reply via WeCom
      try {
        await this.wecomService.sendMessage(fromUser, response.content);
      } catch (error) {
        console.error('Failed to send WeCom reply:', error);
      }

      // Return success XML
      return res.send('<xml><return_code>0</return_msg>OK</return_msg></xml>');
    } catch (error) {
      console.error('Webhook handling error:', error);
      return res.status(500).send('Internal Server Error');
    }
  }

  /**
   * Map WeCom message type to internal type.
   */
  private mapMessageType(msgType: string): MessageEvent['type'] {
    switch (msgType) {
      case 'text': return 'text';
      case 'image': return 'image';
      case 'voice': return 'voice';
      case 'file': return 'file';
      default: return 'text';
    }
  }
}
