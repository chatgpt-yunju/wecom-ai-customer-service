/**
 * Session Polling Service
 *
 * Polls WeCom API for new messages when webhook mode is not available.
 * Runs as a background service, checking for new sessions/messages at intervals.
 */

import { AppDataSource } from '../config/database';
import { WeComService } from '../wecom/WeComService';
import { SessionService } from './SessionService';
import { MessageService } from './MessageService';
import { logger } from '../utils/logger';

export class PollingService {
  private intervalId: NodeJS.Timeout | null = null;
  private running: boolean = false;
  private pollInterval: number;
  private lastCheck: Date = new Date(0);

  constructor(
    private wecomService: WeComService,
    private sessionService: SessionService,
    private messageService: MessageService,
    pollInterval: number = 10
  ) {
    this.pollInterval = pollInterval * 1000;
  }

  /**
   * Start polling.
   */
  async start(): Promise<void> {
    if (this.running) return;

    this.running = true;
    logger.info('Polling service starting', { interval: this.pollInterval });

    // Run immediately
    this.poll().catch((error) => {
      logger.error('Polling error:', error);
    });

    // Then schedule periodic runs
    this.intervalId = setInterval(() => {
      this.poll().catch((error) => {
        logger.error('Polling error:', error);
      });
    }, this.pollInterval);
  }

  /**
   * Stop polling.
   */
  async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.running = false;
    logger.info('Polling service stopped');
  }

  /**
   * Check if polling is currently running.
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Single polling iteration.
   */
  private async poll(): Promise<void> {
    try {
      // This is a placeholder - actual implementation would:
      // 1. Use WeCom API to check for new messages
      // 2. Compare lastCheck timestamp
      // 3. For new messages, create/get session, save message, trigger AI response
      // 4. Update lastCheck

      // For now, just log that poll ran
      logger.debug('Polling check', { lastCheck: this.lastCheck });
      this.lastCheck = new Date();
    } catch (error) {
      logger.error('Poll iteration failed:', error);
    }
  }
}
