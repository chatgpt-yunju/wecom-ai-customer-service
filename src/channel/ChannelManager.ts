/**
 * OpenClaw Channel Manager
 *
 * Central coordinator for all channel providers.
 * Manages registration, routing, and event distribution.
 */

import { EventEmitter } from 'events';
import type {
  IChannelProvider,
  IChannelManager,
  ChannelConfig,
  ChannelMessage,
  ChannelEvent,
  ChannelStatus,
  ChannelType,
  RouteConfig,
} from './types';

export class ChannelManager extends EventEmitter implements IChannelManager {
  private channels: Map<string, IChannelProvider> = new Map();
  private routes: RouteConfig[] = [];
  private defaultRoute?: RouteConfig;
  private initialized: boolean = false;
  private started: boolean = false;

  constructor(private config?: any) {}

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load channel configurations
    if (this.config?.channels) {
      for (const channelConfig of this.config.channels) {
        if (channelConfig.enabled) {
          try {
            const provider = this.createProvider(channelConfig);
            await provider.initialize(channelConfig.config);
            this.channels.set(provider.channelId, provider);
            this.setupProviderEvents(provider);
          } catch (error) {
            console.error(`Failed to initialize channel ${channelConfig.name}:`, error);
          }
        }
      }
    }

    // Load routing rules
    if (this.config?.routes) {
      this.routes = this.config.routes;
    }
    this.defaultRoute = this.config?.defaultRoute;

    this.initialized = true;
  }

  async start(): Promise<void> {
    if (!this.initialized) {
      throw new Error('ChannelManager not initialized');
    }

    if (this.started) return;

    // Start all channel providers
    const startPromises = Array.from(this.channels.values()).map(provider =>
      provider.start().catch(error => {
        console.error(`Failed to start channel ${provider.channelName}:`, error);
        this.emit('error', { type: 'channel_start_failed', channelId: provider.channelId, error });
      })
    );

    await Promise.all(startPromises);
    this.started = true;
  }

  async stop(): Promise<void> {
    if (!this.started) return;

    const stopPromises = Array.from(this.channels.values()).map(provider =>
      provider.stop().catch(error => console.error(`Error stopping channel ${provider.channelName}:`, error))
    );

    await Promise.all(stopPromises);
    this.channels.clear();
    this.started = false;
  }

  registerChannel(provider: IChannelProvider): void {
    if (this.channels.has(provider.channelId)) {
      throw new Error(`Channel ${provider.channelId} already registered`);
    }
    this.channels.set(provider.channelId, provider);
    this.setupProviderEvents(provider);
  }

  unregisterChannel(channelId: string): boolean {
    const provider = this.channels.get(channelId);
    if (provider) {
      provider.stop().catch(console.error);
      this.channels.delete(channelId);
      return true;
    }
    return false;
  }

  getChannel(channelId: string): IChannelProvider | undefined {
    return this.channels.get(channelId);
  }

  listChannels(): IChannelProvider[] {
    return Array.from(this.channels.values());
  }

  /**
   * Route an inbound message from a channel to appropriate skill(s).
   * Returns array of routed messages (may be split/fanned out).
   */
  async routeInbound(message: ChannelMessage): Promise<ChannelMessage[]> {
    // Find matching route
    const route = this.findRoute(message);
    if (route) {
      // Apply inbound transformations if configured
      if (route.transform?.inbound) {
        message = this.applyTransform(message, route.transform.inbound);
      }
      message.skillId = route.skillId;
    } else if (this.defaultRoute) {
      message.skillId = this.defaultRoute.skillId;
    } else {
      // No route found, log warning
      console.warn(`No route found for message from channel ${message.channelId}`);
      return [];
    }

    // Emit event
    this.emit('channelEvent', {
      type: 'message_received',
      channelId: message.channelId,
      timestamp: new Date(),
      data: message,
    } as ChannelEvent);

    // Return the routed message (could be multiple if fan-out)
    return [message];
  }

  /**
   * Route an outbound message to the appropriate channel.
   */
  async routeOutbound(message: ChannelMessage): Promise<boolean> {
    const channel = this.channels.get(message.channelId);
    if (!channel) {
      console.error(`Channel ${message.channelId} not found for outbound message`);
      return false;
    }

    // Apply outbound transformations if configured (from route?)
    // Could look up route by skillId -> channel mapping

    // Set direction
    message.direction = 'outbound';

    try {
      const success = await channel.send(message);
      if (success) {
        this.emit('channelEvent', {
          type: 'message_sent',
          channelId: message.channelId,
          timestamp: new Date(),
          data: message,
        } as ChannelEvent);
      }
      return success;
    } catch (error) {
      console.error(`Failed to send message via channel ${message.channelId}:`, error);
      this.emit('error', { type: 'message_send_failed', channelId: message.channelId, error });
      return false;
    }
  }

  onChannelEvent(callback: (event: ChannelEvent) => void): void {
    this.on('channelEvent', callback);
  }

  getStatus(): ChannelStatus[] {
    const now = new Date();
    // For now, return basic status. Could add counters in provider or manager.
    return Array.from(this.channels.values()).map(provider => ({
      channelId: provider.channelId,
      channelName: provider.channelName,
      channelType: provider.channelType,
      connected: provider.isConnected(),
      lastActivity: now,
      messageCount: { inbound: 0, outbound: 0 },
      errors: 0,
    }));
  }

  private createProvider(config: ChannelConfig): IChannelProvider {
    const { type } = config;
    switch (type) {
      case 'wecom':
        const wecomProvider = new (require('./providers/WeComChannelProvider')).WeComChannelProvider();
        return wecomProvider;
      case 'webhook':
        const webhookProvider = new (require('./providers/WebhookChannelProvider')).WebhookChannelProvider();
        return webhookProvider;
      case 'websocket':
        const wsProvider = new (require('./providers/WebSocketChannelProvider')).WebSocketChannelProvider();
        return wsProvider;
      default:
        throw new Error(`Unknown channel type: ${type}`);
    }
  }

  private setupProviderEvents(provider: IChannelProvider): void {
    provider.onMessage((msg) => {
      // Route inbound messages from this provider
      this.routeInbound(msg).then(routed => {
        // Emit to skill adapters or OpenClaw runtime
        this.emit('message', ...routed);
      }).catch(console.error);
    });

    provider.onError((err) => {
      this.emit('error', { type: 'channel_error', channelId: provider.channelId, error: err });
    });
  }

  private findRoute(message: ChannelMessage): RouteConfig | undefined {
    // Find first matching route
    for (const route of this.routes) {
      if (this.matchesRoute(message, route)) {
        return route;
      }
    }
    return undefined;
  }

  private matchesRoute(message: ChannelMessage, route: RouteConfig): boolean {
    const { match } = route;

    if (match.eventType && message.content.type !== match.eventType) {
      return false;
    }

    if (match.contentType && message.content.type !== match.contentType) {
      return false;
    }

    if (match.userIdPattern) {
      const regex = new RegExp(match.userIdPattern);
      if (!regex.test(message.from.id)) {
        return false;
      }
    }

    if (match.metadata) {
      for (const [key, value] of Object.entries(match.metadata)) {
        if (message.metadata[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  private applyTransform(message: ChannelMessage, transform: any): ChannelMessage {
    // Deep copy to avoid mutating original
    const result = { ...message, metadata: { ...message.metadata } };

    // Apply field mappings
    if (transform.mappings) {
      for (const [source, target] of Object.entries(transform.mappings)) {
        if (message.raw[source] !== undefined) {
          result.metadata[target] = message.raw[source];
        }
      }
    }

    // Apply static enrichments
    if (transform.enrich?.static) {
      Object.assign(result.metadata, transform.enrich.static);
    }

    // Apply computed enrichments (simple expressions)
    if (transform.enrich?.computed) {
      for (const [expr, target] of Object.entries(transform.enrich.computed)) {
        try {
          // Very simple eval - in production use a safe expression evaluator
          // eslint-disable-next-line no-eval
          const value = eval(expr);
          result.metadata[target] = value;
        } catch (e) {
          console.warn(`Failed to evaluate expression "${expr}":`, e);
        }
      }
    }

    return result;
  }
}
