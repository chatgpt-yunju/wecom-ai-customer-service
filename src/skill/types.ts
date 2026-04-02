/**
 * OpenClaw Skill - Core Type Definitions
 * These types define the contract between OpenClaw runtime and the skill
 */

// ============================================================================
// Configuration Types
// ============================================================================

export interface AIConfig {
  apiBaseUrl: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  systemPrompt?: string;
}

export interface WeComConfig {
  corpId: string;
  corpSecret: string;
  token: string;
  encodingAESKey: string;
  agentId: number;
  apiHost?: string;
}

export interface DatabaseConfig {
  type: 'postgres' | 'mysql' | 'sqlite';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize?: boolean;
  logging?: boolean;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

export interface SkillSettings {
  enablePolling?: boolean;
  pollInterval?: number;
  maxSessionHistory?: number;
  enableKnowledgeRetrieval?: boolean;
  autoTransferThreshold?: number;
  defaultLanguage?: string;
}

export interface SkillConfig {
  ai: AIConfig;
  wecom: WeComConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  skill: SkillSettings;
  // Allow additional custom config
  [key: string]: any;
}

// ============================================================================
// Event Types
// ============================================================================

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  VOICE = 'voice',
}

export enum SenderType {
  USER = 'user',
  AI = 'ai',
  AGENT = 'agent',
}

export interface MessageEvent {
  type: MessageType;
  content: string;
  mediaId?: string;
  userId: string;
  sessionId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface MessageResponse {
  content: string;
  sessionId: string;
  confidence?: number;
  shouldTransferToHuman?: boolean;
  suggestedActions?: string[];
  metadata?: {
    tokensUsed?: number;
    model?: string;
    latency?: number;
  };
}

export interface SessionEvent {
  sessionId: string;
  userId: string;
  startedAt: Date;
  metadata?: Record<string, any>;
}

export interface SessionEndedEvent {
  sessionId: string;
  endedAt: Date;
  reason?: 'completed' | 'transferred' | 'timeout' | 'agent_ended';
  metadata?: Record<string, any>;
}

export interface AgentAssignmentEvent {
  sessionId: string;
  agentId: string;
  assignedAt: Date;
  previousAgentId?: string;
}

export interface KnowledgeEvent {
  documentId: string;
  fileName: string;
  status: 'processing' | 'ready' | 'error';
  errorMessage?: string;
  chunkCount?: number;
}

export interface HealthCheckEvent {
  timestamp: Date;
}

// ============================================================================
// Skill Capability & Configuration Schema
// ============================================================================

export interface SkillCapabilities {
  supportsRAG: boolean;
  supportsHumanHandoff: boolean;
  supportsMultiModal: boolean;
  maxConcurrentSessions: number;
  supportedLanguages: string[];
  version: string;
}

export interface ConfigProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: any;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  pattern?: string;
  items?: ConfigProperty;
  properties?: Record<string, ConfigProperty>;
}

export interface ConfigurationSchema {
  type: 'object';
  properties: Record<string, ConfigProperty>;
  required?: string[];
}

// ============================================================================
// Health & Status
// ============================================================================

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: boolean;
    redis: boolean;
    ai: boolean;
    wecom: boolean;
    [key: string]: boolean;
  };
  lastChecked: Date;
  version: string;
  uptime: number;
  error?: string;
}

// ============================================================================
// Knowledge Base Types
// ============================================================================

export interface KnowledgeDocument {
  id: string;
  name: string;
  description?: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  status: 'processing' | 'ready' | 'error';
  chunkCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  embedding?: number[]; // pgvector representation
  createdAt: Date;
}

export interface KnowledgeQueryResult {
  chunks: KnowledgeChunk[];
  scores: number[]; // similarity scores
  metadata: {
    totalChunks: number;
    queryTime: number;
  };
}

// ============================================================================
// Session & Conversation
// ============================================================================

export interface ConversationMessage {
  id: string;
  sessionId: string;
  role: SenderType;
  content: string;
  msgType: MessageType;
  mediaId?: string;
  aiModelUsed?: string;
  tokenCount?: number;
  createdAt: Date;
}

export interface Session {
  id: string;
  sessionId: string;
  userId: string;
  agentId?: string;
  status: 'active' | 'closed' | 'transferred';
  createdAt: Date;
  closedAt?: Date;
  lastMessageAt?: Date;
  metadata?: Record<string, any>;
}

export interface SessionWithMessages extends Session {
  messages: ConversationMessage[];
}

// ============================================================================
// User & Agent
// ============================================================================

export interface User {
  id: string;
  wecomUserId: string;
  name: string;
  avatarUrl?: string;
  mobile?: string;
  email?: string;
  departmentIds: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Agent {
  id: string;
  agentId: string;
  name: string;
  email: string;
  role: 'admin' | 'agent';
  isOnline: boolean;
  maxConcurrent: number;
  currentConcurrent: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Webhook Types (WeCom)
// ============================================================================

export interface WeComWebhookPayload {
  msgSignature: string;
  timestamp: string;
  nonce: string;
  encrypt: string;
}

export interface WeComMessage {
  ToUserName: string;
  FromUserName: string;
  CreateTime: number;
  MsgType: string;
  Content?: string;
  PicUrl?: string;
  MediaId?: string;
  Format?: string;
  MsgId?: string;
  // Extendable for other message types
  [key: string]: any;
}

// ============================================================================
// Service Container
// ============================================================================

export interface ServiceContainer {
  database: any; // TypeORM DataSource
  redis: any; // Redis client
  logger: any; // Winston logger
  ai: AIService;
  wecom: WeComService;
  session: SessionService;
  message: MessageService;
  user: UserService;
  agent: AgentService;
  knowledge: KnowledgeService;
  admin: AdminService;
  polling?: PollingService;
}

// Abstract service interfaces (for dependency injection)
export interface AIService {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
  healthCheck(): Promise<boolean>;
}

export interface WeComService {
  getUser(userId: string): Promise<User>;
  sendMessage(userId: string, content: string, msgType?: MessageType): Promise<boolean>;
  getAccessToken(): Promise<string>;
  healthCheck(): Promise<boolean>;
}

export interface SessionService {
  createSession(userId: string, metadata?: Record<string, any>): Promise<string>;
  getSession(sessionId: string): Promise<Session | null>;
  getSessionWithMessages(sessionId: string): Promise<SessionWithMessages | null>;
  getActiveSessions(userId?: string): Promise<Session[]>;
  closeSession(sessionId: string): Promise<void>;
  transferSession(sessionId: string, agentId: string): Promise<void>;
  updateLastMessage(sessionId: string): Promise<void>;
}

export interface MessageService {
  saveMessage(params: {
    sessionId: string;
    content: string;
    role: SenderType;
    senderId: string;
    msgType: MessageType;
    mediaId?: string;
    aiModelUsed?: string;
    tokenCount?: number;
  }): Promise<ConversationMessage>;
  getBySession(sessionId: string): Promise<ConversationMessage[]>;
  getHistory(sessionId: string, limit: number): Promise<ConversationMessage[]>;
  getRecent(limit: number): Promise<ConversationMessage[]>;
}

export interface UserService {
  getOrCreateUser(wecomUserId: string): Promise<User>;
  getUser(userId: string): Promise<User | null>;
  updateUser(userId: string, updates: Partial<User>): Promise<User>;
  getAllUsers(page?: number, limit?: number): Promise<{ users: User[]; total: number }>;
}

export interface AgentService {
  getAvailableAgents(): Promise<Agent[]>;
  claimSession(sessionId: string, agentId: string): Promise<boolean>;
  getAgentSessions(agentId: string): Promise<Session[]>;
  sendAgentMessage(sessionId: string, agentId: string, content: string): Promise<ConversationMessage>;
  closeSession(sessionId: string, agentId: string): Promise<void>;
  updateAgentStatus(agentId: string, isOnline: boolean): Promise<void>;
}

export interface KnowledgeService {
  uploadDocument(file: Express.Multer.File, description?: string): Promise<KnowledgeDocument>;
  getDocument(documentId: string): Promise<KnowledgeDocument | null>;
  listDocuments(page?: number, limit?: number): Promise<{ documents: KnowledgeDocument[]; total: number }>;
  deleteDocument(documentId: string): Promise<void>;
  queryKnowledge(query: string, topK?: number): Promise<KnowledgeQueryResult>;
  reprocessDocument(documentId: string): Promise<void>;
}

export interface AdminService {
  getUsers(page: number, limit: number, filters?: Record<string, any>): Promise<{ users: User[]; total: number }>;
  getSessions(filters?: Record<string, any>): Promise<{ sessions: Session[]; total: number }>;
  getSessionDetails(sessionId: string): Promise<SessionWithMessages | null>;
  getAgents(page?: number, limit?: number): Promise<{ agents: Agent[]; total: number }>;
  getStatistics(days?: number): Promise<Record<string, any>>;
  getSystemConfig(): Promise<Record<string, any>>;
  updateSystemConfig(key: string, value: any): Promise<void>;
}

export interface PollingService {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
}

// ============================================================================
// Chat Message Format (OpenAI compatible)
// ============================================================================

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  onChunk?: (chunk: string) => void;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[] ? DeepPartial<U>[] : DeepPartial<T[P]>;
};
