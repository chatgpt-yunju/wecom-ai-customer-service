/**
 * Skill Configuration Loader and Validator
 *
 * Handles loading configuration from environment variables, config files,
 * or injected configuration from OpenClaw runtime.
 */

import type { SkillConfig, ConfigurationSchema } from '../types';

export class SkillConfigLoader {
  private static configSchema: ConfigurationSchema = {
    type: 'object',
    properties: {
      ai: {
        type: 'object',
        properties: {
          apiBaseUrl: {
            type: 'string',
            description: 'Base URL for AI API (OpenAI-compatible endpoint)',
            required: true,
          },
          apiKey: {
            type: 'string',
            description: 'API key for AI service',
            required: true,
          },
          model: {
            type: 'string',
            description: 'AI model to use',
            required: true,
          },
          maxTokens: {
            type: 'number',
            description: 'Maximum tokens in response',
            required: false,
            default: 4000,
          },
          temperature: {
            type: 'number',
            description: 'Temperature for sampling (0-2)',
            required: false,
            default: 0.7,
          },
          systemPrompt: {
            type: 'string',
            description: 'System prompt for AI',
            required: false,
            default: '你是一个专业的客服助手。',
          },
        },
        required: ['apiBaseUrl', 'apiKey', 'model'],
      },
      wecom: {
        type: 'object',
        properties: {
          corpId: {
            type: 'string',
            description: 'WeCom enterprise ID',
            required: true,
          },
          corpSecret: {
            type: 'string',
            description: 'WeCom corp secret',
            required: true,
          },
          token: {
            type: 'string',
            description: 'WeCom callback token',
            required: true,
          },
          encodingAESKey: {
            type: 'string',
            description: 'WeCom message encryption key',
            required: true,
          },
          agentId: {
            type: 'number',
            description: 'WeCom agent ID',
            required: true,
          },
          apiHost: {
            type: 'string',
            description: 'WeCom API host',
            required: false,
            default: 'https://qyapi.weixin.qq.com/cgi-bin',
          },
        },
        required: ['corpId', 'corpSecret', 'token', 'encodingAESKey', 'agentId'],
      },
      database: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Database type',
            required: false,
            default: 'postgres',
            enum: ['postgres', 'mysql', 'sqlite'],
          },
          host: {
            type: 'string',
            description: 'Database host',
            required: true,
          },
          port: {
            type: 'number',
            description: 'Database port',
            required: true,
          },
          username: {
            type: 'string',
            description: 'Database username',
            required: true,
          },
          password: {
            type: 'string',
            description: 'Database password',
            required: true,
          },
          database: {
            type: 'string',
            description: 'Database name',
            required: true,
          },
          synchronize: {
            type: 'boolean',
            description: 'Sync entities with database (use migrations in production)',
            required: false,
            default: false,
          },
          logging: {
            type: 'boolean',
            description: 'Enable SQL query logging',
            required: false,
            default: false,
          },
        },
        required: ['host', 'port', 'username', 'password', 'database'],
      },
      redis: {
        type: 'object',
        properties: {
          host: {
            type: 'string',
            description: 'Redis host',
            required: true,
          },
          port: {
            type: 'number',
            description: 'Redis port',
            required: true,
          },
          password: {
            type: 'string',
            description: 'Redis password',
            required: false,
          },
          db: {
            type: 'number',
            description: 'Redis database number',
            required: false,
            default: 0,
          },
        },
        required: ['host', 'port'],
      },
      skill: {
        type: 'object',
        properties: {
          enablePolling: {
            type: 'boolean',
            description: 'Enable fallback polling mode (use webhook if false)',
            required: false,
            default: false,
          },
          pollInterval: {
            type: 'number',
            description: 'Polling interval in seconds',
            required: false,
            default: 10,
          },
          maxSessionHistory: {
            type: 'number',
            description: 'Maximum number of messages to include in conversation history',
            required: false,
            default: 20,
          },
          enableKnowledgeRetrieval: {
            type: 'boolean',
            description: 'Enable RAG knowledge retrieval',
            required: false,
            default: true,
          },
          autoTransferThreshold: {
            type: 'number',
            description: 'Confidence threshold for auto-transferring to human agent',
            required: false,
            default: 0.3,
          },
          defaultLanguage: {
            type: 'string',
            description: 'Default language for AI responses',
            required: false,
            default: 'zh-CN',
          },
        },
        required: [],
      },
    },
    required: ['ai', 'wecom', 'database', 'redis'],
  };

  /**
   * Get the configuration schema for OpenClaw runtime validation.
   */
  static getSchema(): ConfigurationSchema {
    return this.configSchema;
  }

  /**
   * Load configuration from multiple sources in order of priority:
   * 1. Injected config object (from OpenClaw runtime)
   * 2. Environment variables
   * 3. Config file (config/skill-config.json)
   * 4. .env file (for development)
   *
   * @param injectedConfig - Config injected by OpenClaw runtime (highest priority)
   * @param env - Environment variables object (defaults to process.env)
   * @returns Validated and merged configuration
   */
  static async load(
    injectedConfig?: Partial<SkillConfig>,
    env?: Record<string, string>
  ): Promise<SkillConfig> {
    const environment = env || process.env;

    // Load from file if exists
    let fileConfig: Partial<SkillConfig> | null = null;
    try {
      const fs = await import('fs');
      const path = await import('path');
      const configPath = path.join(process.cwd(), 'config', 'skill-config.json');
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');
        fileConfig = JSON.parse(content);
      }
    } catch {
      // File doesn't exist or can't be parsed, ignore
    }

    // Build config with priority: injected > env vars > file > defaults
    const config: Partial<SkillConfig> = {
      ai: {
        apiBaseUrl: this.getFromSources(['OPENCLAW_AI_API_BASE_URL', 'AI_API_BASE_URL'], injectedConfig?.ai, fileConfig?.ai),
        apiKey: this.getFromSources(['OPENCLAW_AI_API_KEY', 'AI_API_KEY'], injectedConfig?.ai, fileConfig?.ai),
        model: this.getFromSources(['OPENCLAW_AI_MODEL', 'AI_MODEL'], injectedConfig?.ai, fileConfig?.ai),
        maxTokens: this.getNumberFromSources(['OPENCLAW_AI_MAX_TOKENS', 'AI_MAX_TOKENS'], injectedConfig?.ai, fileConfig?.ai, 4000),
        temperature: this.getNumberFromSources(['OPENCLAW_AI_TEMPERATURE', 'AI_TEMPERATURE'], injectedConfig?.ai, fileConfig?.ai, 0.7),
        systemPrompt: this.getFromSources(['OPENCLAW_AI_SYSTEM_PROMPT', 'AI_SYSTEM_PROMPT'], injectedConfig?.ai, fileConfig?.ai),
      },
      wecom: {
        corpId: this.getFromSources(['OPENCLAW_WECOM_CORP_ID', 'WECOM_CORP_ID'], injectedConfig?.wecom, fileConfig?.wecom),
        corpSecret: this.getFromSources(['OPENCLAW_WECOM_CORP_SECRET', 'WECOM_CORP_SECRET'], injectedConfig?.wecom, fileConfig?.wecom),
        token: this.getFromSources(['OPENCLAW_WECOM_TOKEN', 'WECOM_TOKEN'], injectedConfig?.wecom, fileConfig?.wecom),
        encodingAESKey: this.getFromSources(['OPENCLAW_WECOM_ENCODING_AES_KEY', 'WECOM_ENCODING_AES_KEY'], injectedConfig?.wecom, fileConfig?.wecom),
        agentId: this.getNumberFromSources(['OPENCLAW_WECOM_AGENT_ID', 'WECOM_AGENT_ID'], injectedConfig?.wecom, fileConfig?.wecom),
        apiHost: this.getFromSources(['OPENCLAW_WECOM_API_HOST', 'WECOM_API_HOST'], injectedConfig?.wecom, fileConfig?.wecom, 'https://qyapi.weixin.qq.com/cgi-bin'),
      },
      database: {
        type: (this.getFromSources(['OPENCLAW_DB_TYPE', 'DATABASE_TYPE'], injectedConfig?.database, fileConfig?.database) as SkillConfig['database']['type']) || 'postgres',
        host: this.getFromSources(['OPENCLAW_DB_HOST', 'DATABASE_HOST'], injectedConfig?.database, fileConfig?.database),
        port: this.getNumberFromSources(['OPENCLAW_DB_PORT', 'DATABASE_PORT'], injectedConfig?.database, fileConfig?.database),
        username: this.getFromSources(['OPENCLAW_DB_USERNAME', 'DATABASE_USERNAME'], injectedConfig?.database, fileConfig?.database),
        password: this.getFromSources(['OPENCLAW_DB_PASSWORD', 'DATABASE_PASSWORD'], injectedConfig?.database, fileConfig?.database),
        database: this.getFromSources(['OPENCLAW_DB_NAME', 'DATABASE_NAME'], injectedConfig?.database, fileConfig?.database),
        synchronize: this.getBooleanFromSources(['OPENCLAW_DB_SYNCHRONIZE', 'DATABASE_SYNCHRONIZE'], injectedConfig?.database, fileConfig?.database, false),
        logging: this.getBooleanFromSources(['OPENCLAW_DB_LOGGING', 'DATABASE_LOGGING'], injectedConfig?.database, fileConfig?.database, false),
      },
      redis: {
        host: this.getFromSources(['OPENCLAW_REDIS_HOST', 'REDIS_HOST'], injectedConfig?.redis, fileConfig?.redis),
        port: this.getNumberFromSources(['OPENCLAW_REDIS_PORT', 'REDIS_PORT'], injectedConfig?.redis, fileConfig?.redis),
        password: this.getFromSources(['OPENCLAW_REDIS_PASSWORD', 'REDIS_PASSWORD'], injectedConfig?.redis, fileConfig?.redis),
        db: this.getNumberFromSources(['OPENCLAW_REDIS_DB', 'REDIS_DB'], injectedConfig?.redis, fileConfig?.redis, 0),
      },
      skill: {
        enablePolling: this.getBooleanFromSources(['OPENCLAW_SKILL_ENABLE_POLLING', 'POLL_ENABLED'], injectedConfig?.skill, fileConfig?.skill, false),
        pollInterval: this.getNumberFromSources(['OPENCLAW_SKILL_POLL_INTERVAL', 'POLL_INTERVAL'], injectedConfig?.skill, fileConfig?.skill, 10),
        maxSessionHistory: this.getNumberFromSources(['OPENCLAW_SKILL_MAX_HISTORY'], injectedConfig?.skill, fileConfig?.skill, 20),
        enableKnowledgeRetrieval: this.getBooleanFromSources(['OPENCLAW_SKILL_ENABLE_KB'], injectedConfig?.skill, fileConfig?.skill, true),
        autoTransferThreshold: this.getNumberFromSources(['OPENCLAW_SKILL_TRANSFER_THRESHOLD'], injectedConfig?.skill, fileConfig?.skill, 0.3),
        defaultLanguage: this.getFromSources(['OPENCLAW_SKILL_DEFAULT_LANG'], injectedConfig?.skill, fileConfig?.skill, 'zh-CN'),
      },
    };

    // Validate required fields
    this.validateConfig(config);

    return config as SkillConfig;
  }

  private static getFromSources<T>(
    envKeys: string[],
    injected?: Partial<T>,
    file?: Partial<T>,
    fallback?: T
  ): T | undefined {
    // Check injected first
    if (injected) {
      for (const key of envKeys) {
        const keys = key.split('.') as (keyof T)[];
        let value: any = injected;
        for (const k of keys) {
          if (value && typeof value === 'object' && k in value) {
            value = value[k];
          } else {
            value = undefined;
            break;
          }
        }
        if (value !== undefined) return value;
      }
    }

    // Check file config
    if (file) {
      for (const key of envKeys) {
        const keys = key.split('.') as (keyof T)[];
        let value: any = file;
        for (const k of keys) {
          if (value && typeof value === 'object' && k in value) {
            value = value[k];
          } else {
            value = undefined;
            break;
          }
        }
        if (value !== undefined) return value;
      }
    }

    // Check environment variables
    for (const envKey of envKeys) {
      const value = process.env[envKey];
      if (value !== undefined) {
        return (value as unknown) as T;
      }
    }

    return fallback;
  }

  private static getNumberFromSources<T extends Record<string, any>>(
    envKeys: string[],
    injected?: Partial<T>,
    file?: Partial<T>,
    fallback?: number
  ): number {
    const value = this.getFromSources<number>(envKeys, injected, file);
    if (value !== undefined) {
      const num = Number(value);
      if (!isNaN(num)) return num;
    }
    return fallback!;
  }

  private static getBooleanFromSources<T extends Record<string, any>>(
    envKeys: string[],
    injected?: Partial<T>,
    file?: Partial<T>,
    fallback?: boolean
  ): boolean {
    const value = this.getFromSources<string>(envKeys, injected, file);
    if (value !== undefined) {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (lower === 'true' || lower === 'yes' || lower === '1') return true;
        if (lower === 'false' || lower === 'no' || lower === '0') return false;
      }
    }
    return fallback!;
  }

  private static validateConfig(config: Partial<SkillConfig>): void {
    const missing: string[] = [];

    if (!config.ai?.apiBaseUrl) missing.push('ai.apiBaseUrl');
    if (!config.ai?.apiKey) missing.push('ai.apiKey');
    if (!config.ai?.model) missing.push('ai.model');

    if (!config.wecom?.corpId) missing.push('wecom.corpId');
    if (!config.wecom?.corpSecret) missing.push('wecom.corpSecret');
    if (!config.wecom?.token) missing.push('wecom.token');
    if (!config.wecom?.encodingAESKey) missing.push('wecom.encodingAESKey');
    if (!config.wecom?.agentId) missing.push('wecom.agentId');

    if (!config.database?.host) missing.push('database.host');
    if (!config.database?.port) missing.push('database.port');
    if (!config.database?.username) missing.push('database.username');
    if (!config.database?.password) missing.push('database.password');
    if (!config.database?.database) missing.push('database.database');

    if (!config.redis?.host) missing.push('redis.host');
    if (!config.redis?.port) missing.push('redis.port');

    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
  }
}
