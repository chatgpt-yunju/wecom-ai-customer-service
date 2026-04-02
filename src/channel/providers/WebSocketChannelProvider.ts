/**
 * WebSocket Channel Provider
 *
 * Provides real-time bidirectional communication via WebSocket.
 * Supports multiple clients, rooms/channels, and broadcasting.
 */

import { WebSocketServer, WebSocket } from 'ws';
import type {
  IChannelProvider,
  ChannelConfig,
  ChannelMessage,
  MessageParty,
  MessageContent,
} from '../types';

interface WSClient {
  id: string;
  ws: WebSocket;
  userId?: string;
  channelIds: Set<string>;
  connectedAt: Date;
}

export class WebSocketChannelProvider implements IChannelProvider {
  private config!: ChannelConfig;
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WSClient> = new Map();
  private _connected: boolean = false;
  private messageCallback?: (msg: ChannelMessage) => void;
  private errorCallback?: (err: Error) => void;
  private clientIdCounter: number = 0;

  constructor(private port?: number, private path: string = '/ws/channel') {}

  get channelId(): string {
    return this.config.name || 'websocket-default';
  }

  get channelName(): string {
    return this.config.name || 'WebSocket Channel';
  }

  get channelType(): 'websocket' {
    return 'websocket';
  }

  async initialize(config: ChannelConfig['config']): Promise<void> {
    this.config = {
      type: 'websocket',
      name: 'WebSocket Channel',
      enabled: true,
      config,
    };

    this.port = config.port || 3001;
  }

  async start(): Promise<void> {
    if (this.wss) {
      throw new Error('WebSocket server already running');
    }

    this.wss = new WebSocketServer({ port: this.port, path: this.path });

    this.wss.on('connection', (ws: WebSocket, req: any) => {
      this.handleConnection(ws, req);
    });

    this.wss.on('error', (error: Error) => {
      this._connected = false;
      this.errorCallback?.(error);
    });

    this.wss.on('listening', () => {
      this._connected = true;
      console.log(`WebSocket channel listening on ws://localhost:${this.port}${this.path}`);
    });
  }

  async stop(): Promise<void> {
    if (this.wss) {
      // Notify all clients
      this.broadcastToAll({
        type: 'close',
        reason: 'server_shutdown',
      });

      this.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.close(1001, 'Server shutting down');
        }
      });

      this.wss.close();
      this.wss = null;
      this.clients.clear();
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
    return this._connected && this.wss !== null;
  }

  /**
   * Send message to specific connected clients (by WebSocket channel IDs)
   */
  async send(message: ChannelMessage): Promise<boolean> {
    const targets = message.to.id ? this.findClientsByChannel(message.to.id) : this.clients;

    if (targets.size === 0) {
      return false;
    }

    const payload = JSON.stringify({
      type: 'message',
      message,
    });

    let allSent = true;
    targets.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload, (err) => {
          if (err) {
            console.error('WS send error:', err);
            allSent = false;
          }
        });
      } else {
        allSent = false;
      }
    });

    return allSent;
  }

  async broadcast(messages: ChannelMessage[]): Promise<boolean[]> {
    const results = await Promise.all(messages.map(msg => this.send(msg)));
    return results;
  }

  /**
   * Get connected clients count.
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get clients by channel (room) ID.
   */
  getClientsByChannel(channelId: string): WSClient[] {
    return Array.from(this.clients.values()).filter(c => c.channelIds.has(channelId));
  }

  /**
   * Send a message to all connected clients (no filtering).
   */
  private broadcastToAll(data: any, excludeClientId?: string): void {
    const payload = JSON.stringify(data);
    this.clients.forEach(client => {
      if (client.id !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    });
  }

  private handleConnection(ws: WebSocket, req: any): void {
    const clientId = `ws-${++this.clientIdCounter}`;
    const url = new URL(req.url || '', `ws://localhost:${this.port}`);
    const channelIds = url.searchParams.get('channels')?.split(',') || [];

    const client: WSClient = {
      id: clientId,
      ws,
      userId: url.searchParams.get('userId'),
      channelIds: new Set(channelIds),
      connectedAt: new Date(),
    };

    this.clients.set(clientId, client);

    console.log(`WS client connected: ${clientId} (user: ${client.userId || 'anonymous'})`);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      clientId,
      channels: Array.from(channelIds),
      timestamp: new Date().toISOString(),
    }));

    ws.on('message', (data: any) => {
      this.handleClientMessage(client, data);
    });

    ws.on('close', () => {
      this.handleDisconnect(client);
    });

    ws.on('error', (error: Error) => {
      console.error(`WS client ${clientId} error:`, error);
      this.errorCallback?.(error);
    });
  }

  private handleClientMessage(client: WSClient, data: any): void {
    try {
      const msg = typeof data === 'string' ? JSON.parse(data) : JSON.parse(data.toString());

      // Handle control messages
      if (msg.type === 'ping') {
        client.ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        return;
      }

      if (msg.type === 'subscribe') {
        const newChannels = msg.channels || [];
        newChannels.forEach((ch: string) => client.channelIds.add(ch));
        client.ws.send(JSON.stringify({
          type: 'subscribed',
          channels: Array.from(client.channelIds),
        }));
        return;
      }

      if (msg.type === 'unsubscribe') {
        const channels = msg.channels || [];
        channels.forEach((ch: string) => client.channelIds.delete(ch));
        client.ws.send(JSON.stringify({
          type: 'unsubscribed',
          channels: Array.from(client.channelIds),
        }));
        return;
      }

      // Convert to ChannelMessage and forward
      const channelMsg: ChannelMessage = {
        id: msg.id || `ws-in-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        channelId: msg.channelId || client.channelIds.values().next().value || 'default',
        channelName: msg.channelName || 'WebSocket',
        channelType: 'websocket',
        timestamp: new Date(msg.timestamp || Date.now()),
        direction: 'inbound',
        from: {
          id: msg.from?.id || client.userId || client.id,
          name: msg.from?.name || client.userId || 'WebSocket User',
          type: msg.from?.type || 'user',
        },
        to: msg.to || { id: 'system', name: 'System', type: 'system' },
        content: this.parseContent(msg.content),
        raw: msg,
        metadata: msg.metadata || { clientId: client.id },
      };

      this.messageCallback?.(channelMsg);
    } catch (error: any) {
      console.error('Failed to parse WS message:', error);
      client.ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  }

  private handleDisconnect(client: WSClient): void {
    console.log(`WS client disconnected: ${client.id}`);
    this.clients.delete(client);
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

  /**
   * Find clients subscribed to a specific channel.
   */
  private findClientsByChannel(channelId: string): Map<string, WSClient> {
    const result = new Map<string, WSClient>();
    this.clients.forEach((client, id) => {
      if (client.channelIds.has(channelId)) {
        result.set(id, client);
      }
    });
    return result;
  }
}
