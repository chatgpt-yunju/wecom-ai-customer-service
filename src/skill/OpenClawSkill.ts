/**
 * OpenClaw Skill Implementation
 *
 * Main skill class that implements IOpenClawSkill interface.
 * Encapsulates the WeCom AI Customer Service functionality as an OpenClaw skill.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  SkillConfig,
  IOpenClawSkill,
  SkillCapabilities,
  ConfigurationSchema,
  HealthStatus,
  MessageEvent,
  MessageResponse,
  SessionEvent,
  SessionEndedEvent,
  AgentAssignmentEvent,
  KnowledgeEvent,
  WebhookEndpoint,
  ServiceContainer,
  AIService,
  WeComService,
} from './types';
import { SkillConfigLoader } from './config/SkillConfigLoader';
import { AIService as AIServiceImpl } from '../ai/AIService';
import { WeComService as WeComServiceImpl } from '../wecom/WeComService';
import {
  SessionService,
  MessageService,
  UserService,
  AgentService,
  KnowledgeService,
  AdminService,
  PollingService,
} from '../services';
import { AppDataSource } from '../config/database';
import { connectRedis, redisClient } from '../utils/redis';
import { logger } from '../utils/logger';

export class OpenClawSkill implements IOpenClawSkill {
  private config!: SkillConfig;
  private services!: ServiceContainer;
  private running: boolean = false;
  private startTime: Date = new Date();

  // Optional Express adapter for HTTP mode
  private adapter: any = null;

  constructor(adapter?: any) {
    this.adapter = adapter;
  }

  /**
   * Initialize the skill with configuration.
   */
  async initialize(config: SkillConfig): Promise<void> {
    this.validateConfig(config);
    this.config = config;

    logger.info('Initializing OpenClaw Skill', { version: '1.0.0' });

    // Initialize database
    await AppDataSource.initialize();
    logger.info('Database connected');

    // Initialize Redis
    await connectRedis();
    logger.info('Redis connected');

    // Initialize AI service
    const aiService = new AIServiceImpl({
      apiBaseUrl: config.ai.apiBaseUrl,
      apiKey: config.ai.apiKey,
      model: config.ai.model,
      maxTokens: config.ai.maxTokens,
      temperature: config.ai.temperature,
      systemPrompt: config.ai.systemPrompt,
    });

    // Initialize WeCom service
    const wecomService = new WeComServiceImpl({
      corpId: config.wecom.corpId,
      corpSecret: config.wecom.corpSecret,
      token: config.wecom.token,
      encodingAESKey: config.wecom.encodingAESKey,
      agentId: config.wecom.agentId,
      apiHost: config.wecom.apiHost,
    });

    // Initialize services with dependency injection
    const sessionService = new SessionService(AppDataSource);
    const messageService = new MessageService(AppDataSource);
    const userService = new UserService(AppDataSource, wecomService);
    const agentService = new AgentService(AppDataSource, wecomService);
    const knowledgeService = new KnowledgeService(AppDataSource, config.skill.enableKnowledgeRetrieval);
    const adminService = new AdminService(AppDataSource);

    // Initialize polling if enabled
    let pollingService: PollingService | undefined;
    if (config.skill.enablePolling) {
      pollingService = new PollingService(
        wecomService,
        sessionService,
        messageService,
        config.skill.pollInterval
      );
    }

    // Build service container
    this.services = {
      database: AppDataSource,
      redis: redisClient,
      logger,
      ai: aiService as unknown as AIService,
      wecom: wecomService as unknown as WeComService,
      session: sessionService,
      message: messageService,
      user: userService,
      agent: agentService,
      knowledge: knowledgeService,
      admin: adminService,
      polling: pollingService,
    };

    logger.info('Services initialized');
  }

  /**
   * Start the skill.
   */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.startTime = new Date();

    logger.info('Starting OpenClaw Skill');

    // Start polling if enabled
    if (this.services.polling) {
      await this.services.polling.start();
    }

    // Mount HTTP adapter if present
    if (this.adapter) {
      this.adapter.mount(this);
    }

    logger.info('OpenClaw Skill started successfully');
  }

  /**
   * Stop the skill gracefully.
   */
  async stop(): Promise<void> {
    logger.info('Stopping OpenClaw Skill');

    this.running = false;

    if (this.services.polling) {
      await this.services.polling.stop();
    }

    // Close connections
    try {
      await AppDataSource.destroy();
      const redis = getRedisClient();
      await redis.quit();
    } catch (error) {
      logger.error('Error during cleanup:', error);
    }

    logger.info('OpenClaw Skill stopped');
  }

  /**
   * Handle incoming message event.
   */
  async onMessageReceived(event: MessageEvent): Promise<MessageResponse> {
    const startTime = Date.now();

    try {
      // Ensure session exists
      let sessionId = event.sessionId;
      if (!sessionId) {
        const user = await this.services.user.getOrCreateUser(event.userId);
        sessionId = await this.services.session.createSession(user.id);
      }

      // Save user message
      await this.services.message.saveMessage({
        sessionId,
        content: event.content,
        role: 'user',
        senderId: event.userId,
        msgType: event.type,
      });

      // Retrieve knowledge context if enabled
      let contextTexts: string[] = [];
      if (this.config.skill.enableKnowledgeRetrieval) {
        try {
          const kbResults = await this.services.knowledge.queryKnowledge(event.content, 3);
          contextTexts = kbResults.chunks.map(chunk => chunk.content);
        } catch (error) {
          logger.warn('Knowledge retrieval failed:', error);
        }
      }

      // Get conversation history
      const maxHistory = this.config.skill.maxSessionHistory || 20;
      const history = await this.services.message.getHistory(sessionId, maxHistory);

      // Build AI messages with optional context
      const systemPrompt = this.config.ai.systemPrompt || '你是一个专业的客服助手。';
      let messages = history.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      // Prepend knowledge context if available
      if (contextTexts.length > 0) {
        const contextBlock = '参考知识：\n' + contextTexts.join('\n---\n');
        messages = [
          { role: 'system', content: systemPrompt + '\n\n' + contextBlock },
          ...messages,
        ];
      } else {
        messages = [{ role: 'system', content: systemPrompt }, ...messages];
      }

      // Generate AI response
      let aiReply = '';
      try {
        aiReply = await this.services.ai.chat(messages, {
          temperature: this.config.ai.temperature,
          maxTokens: this.config.ai.maxTokens,
        });
      } catch (error) {
        logger.error('AI chat failed:', error);
        aiReply = '抱歉，我现在无法回复，请稍后再试。';
      }

      // Save AI response
      await this.services.message.saveMessage({
        sessionId,
        content: aiReply,
        role: 'ai',
        senderId: 'ai',
        msgType: 'text',
      });

      // Update session activity
      await this.services.session.updateLastMessage(sessionId);

      const latency = Date.now() - startTime;

      return {
        content: aiReply,
        sessionId,
        metadata: {
          latency,
          model: this.config.ai.model,
        },
      };
    } catch (error) {
      logger.error('Message handling error:', error);
      throw error;
    }
  }

  /**
   * Handle session start.
   */
  async onSessionStarted(event: SessionEvent): Promise<void> {
    logger.info('Session started', { sessionId: event.sessionId, userId: event.userId });
    // Could emit metrics, create audit log, etc.
  }

  /**
   * Handle session end.
   */
  async onSessionEnded(event: SessionEndedEvent): Promise<void> {
    logger.info('Session ended', { sessionId: event.sessionId, reason: event.reason });
    try {
      await this.services.session.closeSession(event.sessionId);
    } catch (error) {
      logger.error('Failed to close session:', error);
    }
  }

  /**
   * Handle agent assignment.
   */
  async onAgentAssigned(event: AgentAssignmentEvent): Promise<void> {
    logger.info('Agent assigned', { sessionId: event.sessionId, agentId: event.agentId });
    try {
      await this.services.session.transferSession(event.sessionId, event.agentId);
    } catch (error) {
      logger.error('Failed to assign agent:', error);
    }
  }

  /**
   * Handle knowledge base update.
   */
  async onKnowledgeUpdated(event: KnowledgeEvent): Promise<void> {
    logger.info('Knowledge updated', { documentId: event.documentId, status: event.status });
    // If processing failed, could trigger retry
  }

  /**
   * Get skill capabilities.
   */
  async getCapabilities(): Promise<SkillCapabilities> {
    return {
      supportsRAG: this.config.skill.enableKnowledgeRetrieval === true,
      supportsHumanHandoff: true,
      supportsMultiModal: false,
      maxConcurrentSessions: 100,
      supportedLanguages: ['zh-CN', 'en'],
      version: '1.0.0',
    };
  }

  /**
   * Get configuration schema.
   */
  getConfigurationSchema(): ConfigurationSchema {
    return SkillConfigLoader.getSchema();
  }

  /**
   * Perform health check.
   */
  async healthCheck(): Promise<HealthStatus> {
    const checks: HealthStatus['checks'] = {
      database: false,
      redis: false,
      ai: false,
      wecom: false,
    };

    try {
      // Check database
      await AppDataSource.initialize();
      checks.database = true;
    } catch {
      checks.database = false;
    }

    try {
      const redis = getRedisClient();
      await redis.ping();
      checks.redis = true;
    } catch {
      checks.redis = false;
    }

    try {
      checks.ai = await this.services.ai.healthCheck();
    } catch {
      checks.ai = false;
    }

    try {
      checks.wecom = await this.services.wecom.healthCheck();
    } catch {
      checks.wecom = false;
    }

    const upTime = (Date.now() - this.startTime.getTime()) / 1000;
    const allHealthy = Object.values(checks).every(Boolean);

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      lastChecked: new Date(),
      version: '1.0.0',
      uptime: upTime,
    };
  }

  /**
   * Get webhook endpoints.
   */
  getWebhookEndpoints(): WebhookEndpoint[] {
    return [
      {
        path: '/wecom/callback',
        methods: ['GET', 'POST'],
        description: 'WeCom message callback webhook',
        authRequired: false,
      },
      {
        path: '/skill/health',
        methods: ['GET'],
        description: 'Skill health check endpoint',
        authRequired: false,
      },
    ];
  }

  /**
   * Validate configuration.
   */
  private validateConfig(config: SkillConfig): void {
    const errors: string[] = [];

    if (!config.ai.apiBaseUrl) errors.push('ai.apiBaseUrl');
    if (!config.ai.apiKey) errors.push('ai.apiKey');
    if (!config.ai.model) errors.push('ai.model');

    if (!config.wecom.corpId) errors.push('wecom.corpId');
    if (!config.wecom.corpSecret) errors.push('wecom.corpSecret');
    if (!config.wecom.token) errors.push('wecom.token');
    if (!config.wecom.encodingAESKey) errors.push('wecom.encodingAESKey');
    if (!config.wecom.agentId) errors.push('wecom.agentId');

    if (!config.database.host) errors.push('database.host');
    if (!config.database.port) errors.push('database.port');
    if (!config.database.username) errors.push('database.username');
    if (!config.database.password) errors.push('database.password');
    if (!config.database.database) errors.push('database.database');

    if (!config.redis.host) errors.push('redis.host');
    if (!config.redis.port) errors.push('redis.port');

    if (errors.length > 0) {
      throw new Error(`Invalid configuration: ${errors.join(', ')}`);
    }
  }

  /**
   * Get services (for adapter access).
   */
  getServices(): ServiceContainer {
    return this.services;
  }

  /**
   * Get configuration (for internal use).
   */
  getConfig(): SkillConfig {
    return this.config;
  }
}
