/**
 * Webhook Channel Provider
 *
 * Provides channel integration for generic webhooks.
 * Listens on an HTTP endpoint and converts incoming HTTP requests to ChannelMessages.
 * Can also send outbound messages via webhook POST requests.
 */

import express, { Request, Response } from 'express';
import axios from 'axios';
import type {
  IChannelProvider,
  ChannelConfig,
  ChannelMessage,
  MessageParty,
  MessageContent,
} from '../types';

export class WebhookChannelProvider implements IChannelProvider {
  private config!: ChannelConfig;
  private app: express.Application | null = null;
  private server: any = null;
  private _connected: boolean = false;
  private messageCallback?: (msg: ChannelMessage) => void;
  private errorCallback?: (err: Error) => void;

  constructor(private port?: number, private path: string = '/webhook') {}

  get channelId(): string {
    return this.config.name || 'webhook-default';
  }

  get channelName(): string {
    return this.config.name || 'Webhook Channel';
  }

  get channelType(): 'webhook' {
    return 'webhook';
  }

  async initialize(config: ChannelConfig['config']): Promise<void> {
    this.config = {
      type: 'webhook',
      name: 'Webhook Channel',
      enabled: true,
      config,
    };

    this.port = config.port || 3002;
    this.app = express();

    // Middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Verify signature if secret provided
    if (config.secret) {
      this.app.use(this.verifySignature.bind(this));
    }

    // Webhook endpoint
    this.app.post(this.path, this.handleRequest.bind(this));

    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: this._connected ? 'ok' : 'down' });
    });
  }

  async start(): Promise<void> {
    if (!this.app) {
      throw new Error('WebhookChannelProvider not initialized');
    }

    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, () => {
        this._connected = true;
        console.log(`Webhook channel listening on port ${this.port}${this.path}`);
        resolve();
      });

      this.server.on('error', (err: any) => {
        this._connected = false;
        this.errorCallback?.(err);
        reject(err);
      });
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      await new Promise((resolve) => this.server.close(resolve));
      this._connected = false;
    }
  }

  onMessage(callback: (msg: ChannelMessage) => void): void {
    this.messageCallback = callback;
  }

  onError(callback: (err: Error) => void): void {
    this.errorCallback = callback;
  }

  isConnected(): boolean {
    return this._connected;
  }

  async healthCheck(): Promise<boolean> {
    return this._connected;
  }

  /**
   * Send outbound message via webhook POST.
   */
  async send(message: ChannelMessage): Promise<boolean> {
    try {
      const targetUrl = this.config.config.url;
      if (!targetUrl) {
        throw new Error('No target URL configured for webhook outbound');
      }

      const payload = {
        id: message.id,
        channelId: message.channelId,
        channelType: message.channelType,
        timestamp: message.timestamp,
        from: message.from,
        to: message.to,
        content: message.content,
        metadata: message.metadata,
        raw: message.raw,
      };

      const response = await axios.post(targetUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'OpenClaw-Webhook/1.0',
          'X-Channel-ID': message.channelId,
          'X-Message-ID': message.id,
        },
        timeout: 10000,
      });

      return response.status >= 200 && response.status < 300;
    } catch (error: any) {
      console.error('Webhook send error:', error.message);
      this.errorCallback?.(error);
      return false;
    }
  }

  async broadcast(messages: ChannelMessage[]): Promise<boolean[]> {
    const results = await Promise.all(messages.map(msg => this.send(msg)));
    return results;
  }

  /**
   * Handle incoming HTTP request and convert to ChannelMessage.
   */
  private async handleRequest(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body;

      // Build ChannelMessage from request
      const channelMsg: ChannelMessage = {
        id: body.id || `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        channelId: this.channelId,
        channelName: this.channelName,
        channelType: 'webhook',
        timestamp: new Date(body.timestamp ? new Date(body.timestamp) : Date.now()),
        direction: 'inbound',
        from: {
          id: body.from?.id || 'unknown',
          name: body.from?.name,
          type: body.from?.type || 'user',
          channelSpecific: body.from?.channelSpecific,
        },
        to: {
          id: body.to?.id || this.config.config.agentId?.toString() || 'system',
          name: body.to?.name || 'System',
          type: body.to?.type || 'system',
        },
        content: this.parseContent(body.content),
        raw: body,
        metadata: body.metadata || {},
      };

      // Ensure minimal required fields
      if (!channelMsg.content.type) {
        channelMsg.content.type = 'text';
      }

      this.messageCallback?.(channelMsg);

      res.json({ success: true, messageId: channelMsg.id });
    } catch (error: any) {
      console.error('Webhook request error:', error);
      res.status(500).json({ success: false, error: error.message });
      this.errorCallback?.(error);
    }
  }

  /**
   * Verify webhook signature.
   */
  private verifySignature(req: Request, res: Response, next: Function): void {
    const signature = req.headers['x-webhook-signature'] as string;
    const secret = this.config.config.secret;

    if (!signature || !secret) {
      if (secret) {
        return res.status(401).json({ error: 'Missing signature' });
      }
      return next(); // No secret configured, skip verification
    }

    const payload = JSON.stringify(req.body);
    const expected = this.computeSignature(payload, secret);

    if (signature !== expected) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    next();
  }

  private computeSignature(payload: string, secret: string): string {
    // HMAC-SHA256
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    return hmac.digest('hex');
  }

  private parseContent(content: any): MessageContent {
    if (typeof content === 'string') {
      return { type: 'text', text: content };
    }

    if (typeof content === 'object' && content !== null) {
      return {
        type: content.type || 'text',
        text: content.text,
        attachments: content.attachments,
        fields: content.fields,
      };
    }

    return { type: 'text', text: String(content || '') };
  }
}
