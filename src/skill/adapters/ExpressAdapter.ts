/**
 * Express Adapter
 *
 * Mounts OpenClaw Skill webhook endpoints onto an Express application.
 * Provides HTTP interface for the skill to receive webhook events.
 */

import express, { Request, Response, NextFunction } from 'express';
import type { IOpenClawSkill } from '../interfaces/IOpenClawSkill';

export class ExpressAdapter {
  private app: express.Application;
  private skill: IOpenClawSkill;
  private mounted: boolean = false;

  constructor(app?: express.Application) {
    this.app = app || express();
  }

  /**
   * Mount skill routes onto the express app.
   */
  mount(skill: IOpenClawSkill): void {
    this.skill = skill;
    this.mounted = true;

    const endpoints = skill.getWebhookEndpoints?.() || [];

    for (const endpoint of endpoints) {
      this.mountEndpoint(endpoint);
    }

    // Mount health check explicitly
    this.app.get('/skill/health', async (req, res) => {
      try {
        const health = await this.skill.healthCheck();
        const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 503 : 503;
        res.status(statusCode).json(health);
      } catch (error) {
        res.status(500).json({ status: 'unhealthy', error: String(error) });
      }
    });

    // Generic webhook dispatcher
    this.app.all('/webhook/:skill/:event', async (req, res) => {
      try {
        const { event } = req.params;
        const body = req.body;

        // This is a generic webhook forwarder
        // In production, each event type would have a specific handler
        logger.warn('Generic webhook received', { skill: req.params.skill, event });
        res.json({ received: true, event });
      } catch (error) {
        res.status(500).json({ error: 'Webhook processing failed' });
      }
    });
  }

  /**
   * Mount a single endpoint.
   */
  private mountEndpoint(endpoint: import('../types').WebhookEndpoint): void {
    const handler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Check auth if required
        if (endpoint.authRequired && !this.checkAuth(req)) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        // For legacy compatibility, route specific paths to skill event handlers
        if (endpoint.path === '/wecom/callback') {
          // We'll handle separately - WebhookHandler is used directly
          return next();
        }

        // Generic handler: forward event to skill
        // This would need specific implementation per endpoint
        res.json({ message: 'Endpoint mounted', path: endpoint.path });
      } catch (error) {
        next(error);
      }
    };

    const method = endpoint.methods[0].toLowerCase() as 'get' | 'post' | 'put' | 'delete';
    this.app[method](endpoint.path, handler);
  }

  /**
   * Simple auth check (JWT, API key, etc.)
   */
  private checkAuth(req: Request): boolean {
    // Placeholder - implement based on OpenClaw auth scheme
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Verify JWT
      return true;
    }
    return false;
  }

  /**
   * Get the express app instance.
   */
  getApp(): express.Application {
    return this.app;
  }

  /**
   * Start listening on a port.
   */
  listen(port: number, callback?: () => void): void {
    this.app.listen(port, callback);
  }
}
