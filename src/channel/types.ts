/**
 * OpenClaw Channel System - Types
 *
 * Provides abstraction layer for different message channels (WeCom, Slack, webhook, etc.)
 * to route messages through the OpenClaw skill architecture.
 */

// ============================================================================
// Core Channel Types
// ============================================================================

export enum ChannelType {
  WECOM = 'wecom',
  WEBHOOK = 'webhook',
  WEBSOCKET = 'websocket',
  HTTP = 'http',
  CUSTOM = 'custom',
}

export interface ChannelConfig {
  type: ChannelType;
  name: string;
  enabled: boolean;
  // Channel-specific configuration
  config: Record<string, any>;
  // Routing rules
  routes?: RouteConfig[];
}

export interface RouteConfig {
  // Route messages matching certain criteria to specific skill
  skillId: string;
  match: {
    eventType?: string;
    contentType?: string;
    userIdPattern?: string;
    metadata?: Record<string, string>;
  };
  transform?: TransformConfig; // Optional message transformation
}

export interface TransformConfig {
  // How to transform incoming/outgoing messages
  inbound?: MessageTransform;
  outbound?: MessageTransform;
}

export interface MessageTransform {
  // Field mappings, filters, enrichments
  mappings?: Record<string, string>; // sourceField -> targetField
  filters?: TransformFilter[];
  enrich?: EnrichmentConfig;
}

export interface TransformFilter {
  field: string;
  operator: 'equals' | 'contains' | 'regex' | 'exists';
  value: any;
}

export interface EnrichmentConfig {
  // Add static data or computed fields
  static?: Record<string, any>;
  computed?: Record<string, string>; // expression -> field name
}

// ============================================================================
// Unified Message Model
// ============================================================================

export interface ChannelMessage {
  // Unique identifier
  id: string;
  // Channel that received the message
  channelId: string;
  channelName: string;
  channelType: ChannelType;

  // Message metadata
  timestamp: Date;
  direction: 'inbound' | 'outbound';

  // Sender and recipient
  from: MessageParty;
  to: MessageParty;

  // Message content
  content: MessageContent;

  // Context and routing
  sessionId?: string;
  skillId?: string; // Target skill (if routed)

  // Raw channel-specific data (preserved for debugging)
  raw: Record<string, any>;

  // Custom metadata
  metadata: Record<string, any>;
}

export interface MessageParty {
  id: string;
  name?: string;
  type: 'user' | 'agent' | 'system' | 'bot';
  channelSpecific?: Record<string, any>; // Platform-specific fields
}

export interface MessageContent {
  type: 'text' | 'image' | 'file' | 'voice' | 'card' | 'mixed';
  text?: string;
  attachments?: MessageAttachment[];
  fields?: Record<string, any>; // Structured data
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'file' | 'video' | 'audio';
  url?: string;
  filename?: string;
  size?: number;
  mimeType?: string;
  thumbnail?: string;
}

// ============================================================================
// Channel Provider Interface
// ============================================================================

export interface IChannelProvider {
  // Channel metadata
  readonly channelId: string;
  readonly channelName: string;
  readonly channelType: ChannelType;

  // Lifecycle
  initialize(config: ChannelConfig['config']): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;

  // Message handling
  send(message: ChannelMessage): Promise<boolean>;
  broadcast(messages: ChannelMessage[]): Promise<boolean[]>;

  // Events
  onMessage(callback: (msg: ChannelMessage) => void): void;
  onError(callback: (err: Error) => void): void;

  // Status
  isConnected(): boolean;
  healthCheck(): Promise<boolean>;
}

// ============================================================================
// Channel Manager
// ============================================================================

export interface IChannelManager {
  // Lifecycle
  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;

  // Channel registry
  registerChannel(provider: IChannelProvider): void;
  unregisterChannel(channelId: string): boolean;
  getChannel(channelId: string): IChannelProvider | undefined;
  listChannels(): IChannelProvider[];

  // Message routing
  routeInbound(message: ChannelMessage): Promise<ChannelMessage[]>; // Route to appropriate skill(s)
  routeOutbound(message: ChannelMessage): Promise<boolean>; // Send via appropriate channel

  // Events
  onChannelEvent(callback: (event: ChannelEvent) => void): void;

  // Status
  getStatus(): ChannelStatus[];
}

export interface ChannelEvent {
  type: 'channel_connected' | 'channel_disconnected' | 'message_received' | 'message_sent' | 'error';
  channelId: string;
  timestamp: Date;
  data: any;
}

export interface ChannelStatus {
  channelId: string;
  channelName: string;
  channelType: ChannelType;
  connected: boolean;
  lastActivity?: Date;
  messageCount: {
    inbound: number;
    outbound: number;
  };
  errors: number;
}

// ============================================================================
// Skill Integration
// ============================================================================

export interface ISkillChannelAdapter {
  // Connect skill to channel system
  initialize(channelManager: IChannelManager): Promise<void>;

  // Subscribe to messages from specific channels
  subscribe(channelId: string, skillId: string): Promise<void>;
  unsubscribe(channelId: string, skillId: string): Promise<void>;

  // Send message through channel
  sendThroughChannel(channelId: string, message: Partial<ChannelMessage>): Promise<boolean>;

  // Get channel status
  getChannels(): Promise<ChannelStatus[]>;
}

// ============================================================================
// Configuration
// ============================================================================

export interface ChannelSystemConfig {
  enabled: boolean;
  channels: ChannelConfig[];
  defaultRoute?: RouteConfig;
  maxQueueSize?: number;
  retryAttempts?: number;
  retryDelay?: number;
}
