/**
 * SkillConfigLoader Unit Tests
 */

import { SkillConfigLoader } from '../src/skill/config/SkillConfigLoader';

describe('SkillConfigLoader', () => {
  beforeEach(() => {
    // Clean environment variables before each test
    delete process.env.OPENCLAW_AI_API_BASE_URL;
    delete process.env.OPENCLAW_WECOM_CORP_ID;
    // ... etc
  });

  test('should throw error for missing required AI config', async () => {
    // Set some but not all required
    process.env.AI_API_KEY = 'test-key';
    process.env.AI_MODEL = 'gpt-3.5-turbo';

    await expect(SkillConfigLoader.load()).rejects.toThrow('ai.apiBaseUrl');
  });

  test('should throw error for missing WeCom config', async () => {
    // Set some but not all required
    process.env.WECOM_CORP_ID = 'corp-id';
    process.env.WECOM_CORP_SECRET = 'secret';
    process.env.WECOM_TOKEN = 'token';
    process.env.WECOM_ENCODING_AES_KEY = 'encoding';
    process.env.WECOM_AGENT_ID = '1000';
    process.env.AI_API_BASE_URL = 'http://localhost:8000';
    process.env.AI_API_KEY = 'key';
    process.env.AI_MODEL = 'model';

    // Additional missing
    delete process.env.DATABASE_HOST;

    await expect(SkillConfigLoader.load()).rejects.toThrow('database.host');
  });

  test('should successfully load from environment variables', async () => {
    // Set all required env vars
    process.env.AI_API_BASE_URL = 'http://ai.example.com/v1';
    process.env.AI_API_KEY = 'sk-test';
    process.env.AI_MODEL = 'claude-3-opus';

    process.env.WECOM_CORP_ID = 'corp123';
    process.env.WECOM_CORP_SECRET = 'secret123';
    process.env.WECOM_TOKEN = 'token123';
    process.env.WECOM_ENCODING_AES_KEY = 'AESkey123';
    process.env.WECOM_AGENT_ID = '1000';

    process.env.DATABASE_HOST = 'localhost';
    process.env.DATABASE_PORT = '5432';
    process.env.DATABASE_USERNAME = 'postgres';
    process.env.DATABASE_PASSWORD = 'pass';
    process.env.DATABASE_NAME = 'testdb';

    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';

    const config = await SkillConfigLoader.load();

    expect(config.ai.apiBaseUrl).toBe('http://ai.example.com/v1');
    expect(config.ai.apiKey).toBe('sk-test');
    expect(config.wecom.corpId).toBe('corp123');
    expect(config.database.host).toBe('localhost');
    expect(config.redis.host).toBe('localhost');
  });

  test('should override env vars with injected config', async () => {
    // Set env
    process.env.AI_API_BASE_URL = 'http://env.ai/v1';
    process.env.AI_API_KEY = 'env-key';
    process.env.AI_MODEL = 'env-model';

    process.env.WECOM_CORP_ID = 'env-corp';
    process.env.WECOM_CORP_SECRET = 'env-secret';
    process.env.WECOM_TOKEN = 'env-token';
    process.env.WECOM_ENCODING_AES_KEY = 'env-aes';
    process.env.WECOM_AGENT_ID = '1000';

    process.env.DATABASE_HOST = 'env-db';
    process.env.DATABASE_PORT = '5432';
    process.env.DATABASE_USERNAME = 'env-user';
    process.env.DATABASE_PASSWORD = 'env-pass';
    process.env.DATABASE_NAME = 'env-db';

    process.env.REDIS_HOST = 'env-redis';
    process.env.REDIS_PORT = '6379';

    const injected: any = {
      ai: {
        apiBaseUrl: 'http://injected.ai/v1',
        apiKey: 'injected-key',
        model: 'injected-model',
      },
      wecom: {
        corpId: 'injected-corp',
        corpSecret: 'injected-secret',
        token: 'injected-token',
        encodingAESKey: 'injected-aes',
        agentId: 1001,
      },
    };

    const config = await SkillConfigLoader.load(injected);

    expect(config.ai.apiBaseUrl).toBe('http://injected.ai/v1');
    expect(config.ai.apiKey).toBe('injected-key');
    expect(config.wecom.corpId).toBe('injected-corp');
  });

  test('should use default values for optional fields', async () => {
    // Required fields only
    process.env.AI_API_BASE_URL = 'http://ai.example.com/v1';
    process.env.AI_API_KEY = 'key';
    process.env.AI_MODEL = 'model';
    process.env.WECOM_CORP_ID = 'corp';
    process.env.WECOM_CORP_SECRET = 'secret';
    process.env.WECOM_TOKEN = 'token';
    process.env.WECOM_ENCODING_AES_KEY = 'aes';
    process.env.WECOM_AGENT_ID = '1000';
    process.env.DATABASE_HOST = 'localhost';
    process.env.DATABASE_PORT = '5432';
    process.env.DATABASE_USERNAME = 'user';
    process.env.DATABASE_PASSWORD = 'pass';
    process.env.DATABASE_NAME = 'db';
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';

    const config = await SkillConfigLoader.load();

    expect(config.ai.maxTokens).toBe(4000);
    expect(config.ai.temperature).toBe(0.7);
    expect(config.skill.enablePolling).toBe(false);
    expect(config.skill.maxSessionHistory).toBe(20);
  });
});
