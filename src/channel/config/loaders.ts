/**
 * Channel Configuration Loader
 *
 * Loads channel configuration from file or environment.
 */

import type { ChannelSystemConfig } from '../types';

const DEFAULT_CONFIG_PATH = 'config/channels.json';

/**
 * Load channel configuration from a JSON file.
 * Returns undefined if file doesn't exist or is invalid.
 */
export async function loadChannelConfig(configPath?: string): Promise<ChannelSystemConfig | null> {
  const path = configPath || DEFAULT_CONFIG_PATH;
  const fs = await import('fs');

  try {
    if (!fs.existsSync(path)) {
      return null;
    }

    const content = fs.readFileSync(path, 'utf-8');
    const config = JSON.parse(content) as ChannelSystemConfig;

    // Basic validation
    if (!config.enabled && config.enabled !== undefined) {
      return null;
    }

    return config;
  } catch (error: any) {
    console.warn(`Failed to load channel config from ${path}:`, error.message);
    return null;
  }
}

/**
 * Build channel config from skill config (for simple cases)
 * This allows channel configuration to be embedded in main skill config.
 */
export function buildChannelConfigFromSkillConfig(skillConfig: any): ChannelSystemConfig {
  // Check if skillConfig has embedded channel config
  if (skillConfig.channels) {
    return {
      enabled: skillConfig.channelEnabled ?? true,
      channels: skillConfig.channels,
      defaultRoute: skillConfig.defaultRoute,
      maxQueueSize: skillConfig.maxQueueSize ?? 1000,
      retryAttempts: skillConfig.retryAttempts ?? 3,
      retryDelay: skillConfig.retryDelay ?? 1000,
    };
  }

  // Return minimal config with just WeCom if credentials exist
  if (skillConfig.wecom?.corpId) {
    return {
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
          routes: [
            {
              skillId: 'wecom-ai-customer-service',
              match: {},
            },
          ],
        },
      ],
      defaultRoute: {
        skillId: 'wecom-ai-customer-service',
        match: {},
      },
    };
  }

  return { enabled: false, channels: [] };
}
