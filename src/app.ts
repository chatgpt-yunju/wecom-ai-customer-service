/**
 * Main Application Entry Point (Monolithic Mode)
 *
 * This file sets up the Express server, initializes all services,
 * wires up controllers, and starts listening.
 *
 * For Skill Mode, use src/skill-index.ts instead.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import multer from 'multer';
import { createServer, Server } from 'http';
import { Server as WebSocketServer } from 'ws';
import { AppDataSource } from './config/database';
import { connectRedis, redisClient } from './utils/redis';
import { logger } from './utils/logger';
import { AIService } from './ai/AIService';
import { WeComService } from './wecom/WeComService';
import { SessionService } from './services/SessionService';
import { MessageService } from './services/MessageService';
import { UserService } from './services/UserService';
import { AgentService } from './services/AgentService';
import { KnowledgeService } from './services/KnowledgeService';
import { AdminService } from './services/AdminService';
import { PollingService } from './services/PollingService';
import { AIController } from './controllers/AIController';
import { AgentController } from './controllers/AgentController';
import { AdminController } from './controllers/AdminController';
import { KnowledgeController } from './controllers/KnowledgeController';
import { WeComController } from './controllers/WeComController';
import { AuthController } from './controllers/AuthController';
import { MessageApiController } from './controllers/MessageApiController';
import type { SkillConfig } from './skill/types';

// Load configuration from environment (monolithic mode)
function loadConfig(): SkillConfig {
  return {
    ai: {
      apiBaseUrl: process.env.AI_API_BASE_URL || 'https://api.yunjunet.cn/v1',
      apiKey: process.env.AI_API_KEY || '',
      model: process.env.AI_MODEL || 'claude-3-opus-20240229',
      maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4000'),
      temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
      systemPrompt: process.env.AI_SYSTEM_PROMPT || '你是一个专业的客服助手。',
    },
    wecom: {
      corpId: process.env.WECOM_CORP_ID || '',
      corpSecret: process.env.WECOM_CORP_SECRET || '',
      token: process.env.WECOM_TOKEN || '',
      encodingAESKey: process.env.WECOM_ENCODING_AES_KEY || '',
      agentId: parseInt(process.env.WECOM_AGENT_ID || '0'),
      apiHost: process.env.WECOM_API_HOST || 'https://qyapi.weixin.qq.com/cgi-bin',
    },
    database: {
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      username: process.env.DATABASE_USERNAME || 'postgres',
      password: process.env.DATABASE_PASSWORD || '',
      database: process.env.DATABASE_NAME || 'wecom_ai',
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    },
    skill: {
      enablePolling: process.env.POLL_ENABLED === 'true',
      pollInterval: parseInt(process.env.POLL_INTERVAL || '10'),
      maxSessionHistory: 20,
      enableKnowledgeRetrieval: true,
      autoTransferThreshold: 0.3,
      defaultLanguage: 'zh-CN',
    },
  };
}

// Main start function (used by both app.ts and skill-index.ts)
export async function start(): Promise<Server> {
  const PORT = process.env.SERVER_PORT || 3000;

  // Load config
  const config = loadConfig();

  // Initialize database
  await AppDataSource.initialize();
  logger.info('Database connected');

  // Initialize Redis
  await connectRedis();
  logger.info('Redis connected');

  // Create service instances
  const aiService = new AIService({
    apiBaseUrl: config.ai.apiBaseUrl,
    apiKey: config.ai.apiKey,
    model: config.ai.model,
    maxTokens: config.ai.maxTokens,
    temperature: config.ai.temperature,
    systemPrompt: config.ai.systemPrompt,
  });

  const wecomService = new WeComService({
    corpId: config.wecom.corpId,
    corpSecret: config.wecom.corpSecret,
    token: config.wecom.token,
    encodingAESKey: config.wecom.encodingAESKey,
    agentId: config.wecom.agentId,
    apiHost: config.wecom.apiHost,
  });

  const sessionService = new SessionService(AppDataSource);
  const messageService = new MessageService(AppDataSource);
  const userService = new UserService(AppDataSource, wecomService);
  const agentService = new AgentService(AppDataSource, wecomService);
  const knowledgeService = new KnowledgeService(AppDataSource, config.skill.enableKnowledgeRetrieval);
  const adminService = new AdminService(AppDataSource);

  // Create controllers with injected services
  const wecomController = new WeComController(config, {
    ai: aiService,
    wecom: wecomService,
    session: sessionService,
    message: messageService,
    user: userService,
    agent: agentService,
    knowledge: knowledgeService,
    admin: adminService,
    logger,
    redis: getRedisClient(),
    database: AppDataSource,
    polling: undefined,
  } as any);

  const aiController = new AIController(aiService, messageService, sessionService, userService);
  const agentController = new AgentController(agentService);
  const adminController = new AdminController(adminService);
  const knowledgeController = new KnowledgeController(knowledgeService);
  const authController = new AuthController(agentService);
  const messageApiController = new MessageApiController(wecomService);

  // Setup Express
  const app = express();
  const server = createServer(app);
  const wsServer = new WebSocketServer({ server });

  // Middleware
  app.use(helmet());
  app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
  app.use(morgan('combined'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static('public'));

  const upload = multer({ dest: 'uploads/' });

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // WebSocket echo (placeholder)
  wsServer.on('connection', (ws) => {
    logger.info('WebSocket client connected');
    ws.on('message', (data) => {
      try {
        ws.send(JSON.stringify({ type: 'echo', data: JSON.parse(data as string) }));
      } catch (e) {}
    });
    ws.on('close', () => logger.info('WebSocket disconnected'));
  });

  // Mount routes

  // AI Chat endpoint
  app.post('/api/v1/chat/completions', async (req, res) => {
    try {
      await aiController.chat(req, res);
    } catch (error) {
      logger.error('Chat error:', error);
      res.status(500).json({ error: 'AI failed' });
    }
  });

  // WeCom callback
  app.all('/wecom/callback', async (req, res) => {
    await wecomController.callback(req, res);
  });

  // External WeCom messaging API
  app.post('/api/v1/wecom/send', async (req, res) => messageApiController.sendPrivateMessage(req, res));
  app.post('/api/v1/wecom/send/batch', async (req, res) => messageApiController.sendBatchMessages(req, res));
  app.get('/api/v1/wecom/user/:userId', async (req, res) => messageApiController.getUserInfo(req, res));
  app.get('/api/v1/wecom/health', async (req, res) => messageApiController.healthCheck(req, res));

  // Admin routes (protected)
  app.use('/admin', require('./middleware/auth').authMiddleware);
  app.get('/admin/users', async (req, res) => adminController.getUsers(req, res));
  app.get('/admin/sessions', async (req, res) => adminController.getSessions(req, res));
  app.get('/admin/messages', async (req, res) => adminController.getMessages(req, res));
  app.get('/admin/agents', async (req, res) => adminController.getAgents(req, res));
  app.get('/admin/statistics', async (req, res) => adminController.getStatistics(req, res));

  // Knowledge base
  app.post('/admin/kb/upload', upload.single('file'), async (req, res) => knowledgeController.upload(req, res));
  app.get('/admin/kb/list', async (req, res) => knowledgeController.list(req, res));

  // Auth
  app.post('/auth/login', async (req, res) => authController.login(req, res));
  app.post('/auth/change-password', require('./middleware/auth').authMiddleware, async (req, res) => authController.changePassword(req, res));

  // Agent workstation
  app.get('/agent/dashboard', require('./middleware/auth').authMiddleware, (req, res) => {
    res.json({ agent: (req as any).user });
  });
  app.get('/agent/sessions', require('./middleware/auth').authMiddleware, async (req, res) => agentController.getSessions(req, res));
  app.post('/agent/sessions/claim', require('./middleware/auth').authMiddleware, async (req, res) => agentController.claimSession(req, res));
  app.post('/agent/messages/send', require('./middleware/auth').authMiddleware, async (req, res) => agentController.sendMessage(req, res));
  app.post('/agent/sessions/close', require('./middleware/auth').authMiddleware, async (req, res) => agentController.closeSession(req, res));

  // Error handling
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  // Start polling if enabled
  if (config.skill.enablePolling) {
    const pollingService = new PollingService(wecomService, sessionService, messageService, config.skill.pollInterval);
    await pollingService.start();
    logger.info('Polling service started');
  }

  // Start server
  server.listen(PORT, () => {
    logger.info(`🚀 Server started on port ${PORT}`);
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });

  return server;
}

// If this file is executed directly (node src/app.js), start the server
if (require.main === module) {
  start().catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

export { AppDataSource, connectRedis, getRedisClient };
