/**
 * WeCom Controller (Refactored)
 *
 * Thin HTTP adapter for WeCom callback webhook.
 * Delegates to WebhookHandler.
 */

import { Request, Response } from 'express';
import { WebhookHandler } from '../skill/handlers/WebhookHandler';
import type { SkillConfig } from '../skill/types';

export class WeComController {
  private webhookHandler: WebhookHandler;

  constructor(config: SkillConfig, services: any) {
    this.webhookHandler = new WebhookHandler(config, services);
  }

  /**
   * Handle WeCom callback (both verification and messages).
   */
  async callback(req: Request, res: Response): Promise<void> {
    await this.webhookHandler.handle(req, res);
  }
}
