/**
 * OpenClaw Skill Entry Point
 *
 * Runs the wecom-ai-customer-service as an OpenClaw skill.
 * Use OPENCLAW_RUNTIME=true to indicate running under OpenClaw runtime.
 */

import { OpenClawSkill } from './skill/OpenClawSkill';
import { SkillConfigLoader } from './skill/config/SkillConfigLoader';
import { ChannelManager } from './channel/ChannelManager';
import { SkillChannelAdapter } from './channel/SkillChannelAdapter';
import { logger } from './utils/logger';
import { start as startMonolithic } from './app';

async function main() {
  try {
    const skillMode = process.env.OPENCLAW_RUNTIME === 'true' || process.argv.includes('--skill-mode');

    if (skillMode) {
      logger.info('🚀 Starting in OpenClaw Skill mode with Channel integration');

      // Load skill configuration
      const skillConfig = await SkillConfigLoader.load();

      // Load channel configuration (if exists)
      let channelConfig: any = null;
      try {
        const fs = require('fs');
        const path = require('path');
        const channelConfigPath = path.join(process.cwd(), 'config', 'channels.json');
        if (fs.existsSync(channelConfigPath)) {
          channelConfig = JSON.parse(fs.readFileSync(channelConfigPath, 'utf-8'));
          logger.info('Loaded channel configuration from config/channels.json');
        } else {
          // Use example config (simplified inline)
          channelConfig = {
            enabled: true,
            channels: [
              {
                type: 'wecom',
                name: 'WeCom Channel',
                enabled: true,
                config: {
                  corpId: skillConfig.wecom.corpId,
                  corpSecret: skillConfig.wecom.corpSecret,
                  token: skillConfig.wecom.token,
                  encodingAESKey: skillConfig.wecom.encodingAESKey,
                  agentId: skillConfig.wecom.agentId,
                  apiHost: skillConfig.wecom.apiHost,
                },
                routes: [{ skillId: 'wecom-skill', match: {} }],
              },
            ],
            defaultRoute: { skillId: 'wecom-skill', match: {} },
          };
        }
      } catch (error) {
        logger.warn('Failed to load channel config, skipping channel initialization:', error);
      }

      // Create skill instance
      const skill = new OpenClawSkill();

      // Initialize skill (sets up services internally)
      await skill.initialize(skillConfig);

      // Start skill (begins processing events)
      await skill.start();

      // Initialize Channel System if enabled
      let channelManager: any = null;
      let skillAdapter: any = null;
      let wecomProvider: any = null;
      if (channelConfig?.enabled) {
        logger.info('Initializing Channel Manager...');
        const { ChannelManager } = require('./channel/ChannelManager');
        channelManager = new ChannelManager(channelConfig);
        await channelManager.initialize();

        // Create skill channel adapter
        const { SkillChannelAdapter } = require('./channel/SkillChannelAdapter');
        skillAdapter = new SkillChannelAdapter(skill, 'wecom-skill');
        await skillAdapter.initialize(channelManager);

        // Auto-subscribe to all channels that route to this skill
        for (const channel of channelConfig.channels) {
          if (channel.enabled) {
            const matchingRoutes = channel.routes?.filter(r => r.skillId === 'wecom-skill') || [];
            if (matchingRoutes.length > 0) {
              await skillAdapter.subscribe(channel.name, 'wecom-skill');
            }
          }
        }

        // Start channel providers
        await channelManager.start();
        logger.info('Channel system started');

        // Get WeCom provider for webhook handling
        const allChannels = channelManager.listChannels();
        wecomProvider = allChannels.find(c => c.channelType === 'wecom');
      }

      // If not running under OpenClaw runtime, also start a minimal HTTP server
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

        // Channel status endpoint (if channel manager is running)
        if (channelManager) {
          app.get('/channels/status', async (req, res) => {
            res.json(channelManager.getStatus());
          });
        }

        // WeCom webhook - use channel provider if available, else legacy WebhookHandler
        if (wecomProvider) {
          // Channel mode: webhook goes to provider which routes through channel manager
          app.all('/wecom/callback', async (req, res) => {
            try {
              const msgSignature = req.query.msg_signature as string;
              const timestamp = req.query.timestamp as string;
              const nonce = req.query.nonce as string;
              const encrypted = req.body.xml?.Encrypt || '';
              await wecomProvider.handleWebhook(msgSignature, timestamp, nonce, encrypted);
              res.send('<xml><return_code>0</return_msg>OK</return_msg></xml>');
            } catch (error) {
              console.error('Webhook error:', error);
              if (req.query.echostr) {
                return res.send(req.query.echostr);
              }
              res.status(500).send('Internal Server Error');
            }
          });
        } else {
          // Legacy mode: use skill's WebhookHandler directly
          const { WebhookHandler } = require('./skill/handlers/WebhookHandler');
          const webhookHandler = new WebhookHandler(skill);
          app.all('/wecom/callback', async (req, res) => {
            await webhookHandler.handle(req, res);
          });
        }

        const server = require('http').createServer(app);
        server.listen(PORT, () => {
          logger.info(`Skill with Channel system listening on port ${PORT}`);
          console.log(`🚀 Skill server running at http://localhost:${PORT}`);
        });
      } else {
        logger.info('Skill running under OpenClaw runtime with channel support');
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
