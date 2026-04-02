/**
 * OpenClaw Skill Entry Point
 *
 * Runs the wecom-ai-customer-service as an OpenClaw skill.
 * Use OPENCLAW_RUNTIME=true to indicate running under OpenClaw runtime.
 */

import { OpenClawSkill } from './skill/OpenClawSkill';
import { SkillConfigLoader } from './skill/config/SkillConfigLoader';
import { ExpressAdapter } from './skill/adapters/ExpressAdapter';
import { logger } from './utils/logger';
import { start as startMonolithic } from './app';

async function main() {
  try {
    const skillMode = process.env.OPENCLAW_RUNTIME === 'true' || process.argv.includes('--skill-mode');

    if (skillMode) {
      logger.info('🚀 Starting in OpenClaw Skill mode');

      // Load configuration
      const config = await SkillConfigLoader.load();

      // Create skill instance
      const skill = new OpenClawSkill();

      // Initialize skill (sets up services internally)
      await skill.initialize(config);

      // Start skill (begins processing events)
      await skill.start();

      // If not running under OpenClaw runtime, also start a minimal HTTP server
      // to expose webhook endpoints and health check (useful for standalone testing)
      if (process.env.OPENCLAW_RUNTIME !== 'true') {
        const PORT = process.env.SERVER_PORT || 3000;
        const express = require('express');
        const app = express();

        app.use(require('cors')({ origin: process.env.CORS_ORIGIN || '*' }));
        app.use(require('helmet')());
        app.use(require('morgan')('combined'));
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        // Health check
        app.get('/health', async (req, res) => {
          try {
            const health = await skill.healthCheck();
            res.json(health);
          } catch (error) {
            res.status(500).json({ status: 'unhealthy', error: String(error) });
          }
        });

        // WeCom webhook
        const { WebhookHandler } = require('./skill/handlers/WebhookHandler');
        const webhookHandler = new WebhookHandler(skill);
        app.all('/wecom/callback', async (req, res) => {
          await webhookHandler.handle(req, res);
        });

        const server = require('http').createServer(app);
        server.listen(PORT, () => {
          logger.info(`Skill standalone HTTP server listening on port ${PORT}`);
          console.log(`🚀 Skill server running at http://localhost:${PORT}`);
        });
      } else {
        logger.info('Skill running under OpenClaw runtime (no HTTP server)');
      }

      // Handle graceful shutdown
      process.on('SIGTERM', async () => {
        logger.info('SIGTERM received, shutting down');
        await skill.stop();
        process.exit(0);
      });
      process.on('SIGINT', async () => {
        logger.info('SIGINT received, shutting down');
        await skill.stop();
        process.exit(0);
      });

      // Export for OpenClaw runtime if needed
      if (typeof module !== 'undefined' && module.exports) {
        module.exports = { OpenClawSkill, skill };
      }
    } else {
      // Run monolithic mode
      logger.info('🚀 Starting in Monolithic mode');
      await startMonolithic();
    }
  } catch (error) {
    logger.error('Failed to start:', error);
    process.exit(1);
  }
}

main();
