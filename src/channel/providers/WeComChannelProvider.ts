/**
 * WeCom Channel Provider
 *
 * Implements IChannelProvider for WeCom integration.
 * Bridges between WeCom webhook/message API and OpenClaw channel system.
 */

import { EventEmitter } from 'events';
import type {
  IChannelProvider,
  ChannelConfig,
  ChannelMessage,
  MessageParty,
  MessageContent,
} from '../types';
import { WeComService } from '../../wecom/WeComService';
import { WeComCrypto } from '../../wecom/Crypto';

export class WeComChannelProvider extends EventEmitter implements IChannelProvider {
  private config!: ChannelConfig;
  private wecomService!: WeComService;
  private crypto!: WeComCrypto;
  private _connected: boolean = false;

  constructor() {
    super();
  }

  get channelId(): string {
    return this.config.name || 'wecom-default';
  }

  get channelName(): string {
    return this.config.name || 'WeCom Channel';
  }

  get channelType(): 'wecom' {
    return 'wecom';
  }

  async initialize(config: ChannelConfig['config']): Promise<void> {
    this.config = {
      type: 'wecom',
      name: 'WeCom Channel',
      enabled: true,
      config,
    };

    this.wecomService = new WeComService({
      corpId: config.corpId,
      corpSecret: config.corpSecret,
      token: config.token,
      encodingAESKey: config.encodingAESKey,
      agentId: config.agentId,
      apiHost: config.apiHost,
    });

    this.crypto = new WeComCrypto(config.token, config.encodingAESKey);
  }

  async start(): Promise<void> {
    // For WeCom, "connected" means we can get access token
    try {
      const healthy = await this.wecomService.healthCheck();
      this._connected = healthy;
      if (healthy) {
        console.log(`WeCom channel ${this.channelId} started`);
      } else {
        console.warn(`WeCom channel ${this.channelId} started but health check failed`);
      }
    } catch (error) {
      console.error(`Failed to start WeCom channel:`, error);
      this._connected = false;
    }
  }

  async stop(): Promise<void> {
    this._connected = false;
  }

  onMessage(callback: (msg: ChannelMessage) => void): void {
    this.removeAllListeners('message'); // Only one route
    this.on('message', callback);
  }

  onError(callback: (err: Error) => void): void {
    this.removeAllListeners('error');
    this.on('error', callback);
  }

  isConnected(): boolean {
    return this._connected;
  }

  async healthCheck(): Promise<boolean> {
    return this._connected && (await this.wecomService.healthCheck());
  }

  /**
   * Send message through WeCom.
   * Note: WeCom typically only supports outbound messages via API.
   * For workflow, we might want to send to user/agent.
   */
  async send(message: ChannelMessage): Promise<boolean> {
    try {
      // Extract recipient WeCom user ID from `to` field
      const wecomUserId = message.to.id;
      const content = this.formatOutboundMessage(message);

      const success = await this.wecomService.sendMessage(wecomUserId, content, 'text');
      return success;
    } catch (error) {
      console.error('WeCom send error:', error);
      this.emit('error', error as Error);
      return false;
    }
  }

  async broadcast(messages: ChannelMessage[]): Promise<boolean[]> {
    const results = await Promise.all(messages.map(msg => this.send(msg)));
    return results;
  }

  /**
   * Handle WeCom webhook callback (called by HTTP controller).
   * This converts WeCom message into ChannelMessage and emits it.
   */
  async handleWebhook(
    msgSignature: string,
    timestamp: string,
    nonce: string,
    encryptedData: string
  ): Promise<ChannelMessage> {
    try {
      // Decrypt message
      const decrypted = this.crypto.decodeMessage(msg_signature, timestamp, nonce, encryptedData);

      const fromUser = decrypted?.FromUserName;
      const content = decrypted?.Content || '';
      const msgType = decrypted?.MsgType || 'text';
      const msgId = decrypted?.MsgId || undefined;

      if (!fromUser) {
        throw new Error('Invalid WeCom message: missing FromUserName');
      }

      // Fetch user info from WeCom (optional, could be async)
      let userName = fromUser;
      try {
        const userInfo = await this.wecomService.getUser(fromUser);
        userName = userInfo.name;
      } catch (e) {
        // Ignore, use default
      }

      // Build ChannelMessage
      const channelMsg: ChannelMessage = {
        id: msgId || `wecom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        channelId: this.channelId,
        channelName: this.channelName,
        channelType: 'wecom',
        timestamp: new Date(),
        direction: 'inbound',
        from: {
          id: fromUser,
          name: userName,
          type: 'user',
          channelSpecific: {
            wecomUser: fromUser,
          },
        },
        to: {
          id: this.config.config.agentId?.toString() || 'system',
          name: 'WeCom Agent',
          type: 'system',
        },
        content: {
          type: this.mapMessageType(msgType),
          text: content,
        },
        raw: decrypted,
        metadata: {},
      };

      this.emit('message', channelMsg);
      return channelMsg;
    } catch (error) {
      console.error('Webhook handling error:', error);
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Convert ChannelMessage to WeCom format for outbound.
   */
  private formatOutboundMessage(message: ChannelMessage): string {
    // For now, just extract text
    return message.content.text || '';
  }

  private mapMessageType(msgType: string): MessageContent['type'] {
    switch (msgType) {
      case 'text': return 'text';
      case 'image': return 'image';
      case 'voice': return 'voice';
      case 'file': return 'file';
      default: return 'text';
    }
  }
}
