import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import multer from 'multer';
import { Server } from 'ws';
import { createServer } from 'http';
import { AppDataSource } from './config/database';
import { connectRedis } from './utils/redis';
import { logger } from './utils/logger';
import { WeComController } from './controllers/WeComController';
import { AIController } from './controllers/AIController';
import { AdminController } from './controllers/AdminController';
import { KnowledgeController } from './controllers/KnowledgeController';
import { AgentController } from './controllers/AgentController';
import { AuthController } from './controllers/AuthController';
import { MessageApiController } from './controllers/MessageApiController';
import { SessionPollingService } from './SessionPollingService';
import { authMiddleware } from './middleware/auth';

dotenv.config();

const app = express();
const server = createServer(app);
const wsServer = new Server({ server });

const PORT = process.env.SERVER_PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const upload = multer({ dest: 'uploads/' });

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

wsServer.on('connection', (ws) => {
  logger.info('WebSocket client connected');
  ws.on('message', (data) => {
    try { ws.send(JSON.stringify({ type: 'echo', data: JSON.parse(data as string) })); } catch (e) {}
  });
  ws.on('close', () => logger.info('WebSocket disconnected'));
});

const wecomController = new WeComController();
const aiController = new AIController();
const adminController = new AdminController();
const knowledgeController = new KnowledgeController();
const agentController = new AgentController();
const authController = new AuthController();
const messageApiController = new MessageApiController();
const sessionPollingService = new SessionPollingService();

app.post('/api/v1/chat/completions', async (req, res) => {
  try { res.json(await aiController.chat(req, res)); } catch (error) { res.status(500).json({ error: 'AI failed' }); }
});

app.all('/wecom/callback', async (req, res) => {
  await wecomController.callback(req, res);
});

app.post('/api/v1/wecom/send', async (req, res) => messageApiController.sendPrivateMessage(req, res));
app.post('/api/v1/wecom/send/batch', async (req, res) => messageApiController.sendBatchMessages(req, res));
app.get('/api/v1/wecom/user/:userId', async (req, res) => messageApiController.getUserInfo(req, res));
app.get('/api/v1/wecom/health', async (req, res) => messageApiController.healthCheck(req, res));

app.use('/admin', authMiddleware);
app.get('/admin/users', async (req, res) => adminController.getUsers(req, res));
app.get('/admin/sessions', async (req, res) => adminController.getSessions(req, res));
app.get('/admin/messages', async (req, res) => adminController.getMessages(req, res));
app.get('/admin/agents', async (req, res) => adminController.getAgents(req, res));
app.get('/admin/statistics', async (req, res) => adminController.getStatistics(req, res));
app.post('/admin/kb/upload', upload.single('file'), async (req, res) => knowledgeController.upload(req, res));
app.get('/admin/kb/list', async (req, res) => knowledgeController.list(req, res));

app.post('/auth/login', async (req, res) => authController.login(req, res));
app.post('/auth/change-password', authMiddleware, async (req, res) => authController.changePassword(req, res));

app.get('/agent/dashboard', authMiddleware, (req, res) => res.json({ agent: (req as any).user }));
app.get('/agent/sessions', authMiddleware, async (req, res) => agentController.getSessions(req, res));
app.post('/agent/sessions/claim', authMiddleware, async (req, res) => agentController.claimSession(req, res));
app.post('/agent/messages/send', authMiddleware, async (req, res) => agentController.sendMessage(req, res));
app.post('/agent/sessions/close', authMiddleware, async (req, res) => agentController.closeSession(req, res));

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const start = async () => {
  try {
    await AppDataSource.initialize();
    await connectRedis();
    
    if (process.env.POLL_ENABLED === 'true') {
      await sessionPollingService.start();
    }
    
    server.listen(PORT, () => {
      logger.info(`🚀 Server started on port ${PORT}`);
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();

export default app;
