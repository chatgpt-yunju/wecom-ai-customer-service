/**
 * OpenClaw Channel Configuration Example
 *
 * This file demonstrates how to configure the channel system.
 * In production, this should be part of the main skill configuration
 * or loaded from a separate config file (e.g., config/channels.json).
 */

import type { ChannelSystemConfig, ChannelConfig } from '../types';

export const exampleChannelConfig: ChannelSystemConfig = {
  enabled: true,
  channels: [
    {
      type: 'wecom',
      name: 'WeCom Main',
      enabled: true,
      config: {
        corpId: process.env.WECOM_CORP_ID || '',
        corpSecret: process.env.WECOM_CORP_SECRET || '',
        token: process.env.WECOM_TOKEN || '',
        encodingAESKey: process.env.WECOM_ENCODING_AES_KEY || '',
        agentId: parseInt(process.env.WECOM_AGENT_ID || '0'),
        apiHost: process.env.WECOM_API_HOST || 'https://qyapi.weixin.qq.com/cgi-bin',
      },
      routes: [
        {
          skillId: 'wecom-ai-cs-skill',
          match: {
            eventType: 'text',
          },
        },
      ],
    },
    {
      type: 'webhook',
      name: 'External Webhook',
      enabled: false, // Enable when needed
      config: {
        secret: process.env.WEBHOOK_SECRET || '',
        allowedOrigins: ['https://trusted.example.com'],
      },
      routes: [
        {
          skillId: 'wecom-ai-cs-skill',
          match: {
            contentType: 'text',
          },
        },
      ],
    },
    {
      type: 'websocket',
      name: 'Realtime Dashboard',
      enabled: false,
      config: {
        port: parseInt(process.env.WS_PORT || '3001'),
        path: '/ws/channel',
      },
      routes: [
        {
          skillId: 'dashboard-skill',
          match: {
            metadata: { source: 'dashboard' },
          },
        },
      ],
    },
  ],
  defaultRoute: {
    skillId: 'wecom-ai-cs-skill',
    match: {},
  },
  maxQueueSize: 1000,
  retryAttempts: 3,
  retryDelay: 1000,
};

/**
 * Helper to load channel config from environment or file.
 */
export async function loadChannelConfig(): Promise<ChannelSystemConfig> {
  // Could load from JSON file, env vars, or passed in
  return exampleChannelConfig;
}
