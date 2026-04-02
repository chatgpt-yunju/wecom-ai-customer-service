/**
 * AI Service (OpenAI-compatible API client)
 *
 * Provides chat completion interface for any OpenAI-compatible API endpoint.
 * Supports streaming, token counting, and error handling.
 */

import axios, { AxiosInstance } from 'axios';

export interface AIConfig {
  apiBaseUrl: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  systemPrompt?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  content: string;
  tokensUsed?: number;
  model: string;
}

export class AIService {
  private config: AIConfig;
  private client: AxiosInstance;

  constructor(config: AIConfig) {
    this.config = {
      temperature: 0.7,
      maxTokens: 4000,
      ...config,
    };
    this.client = axios.create({
      baseURL: this.config.apiBaseUrl,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    });
  }

  /**
   * Generate chat completion.
   * Takes an array of messages and returns the AI's response.
   */
  async chat(messages: ChatMessage[], options?: { systemPrompt?: string }): Promise<string> {
    const systemPrompt = options?.systemPrompt || this.config.systemPrompt || '你是一个专业的客服助手。';

    const payload = {
      model: this.config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      stream: false,
    };

    try {
      const response = await this.client.post('/chat/completions', payload);
      const data = response.data;

      if (data.error) {
        throw new Error(`AI API error: ${data.error.message}`);
      }

      const content = data.choices?.[0]?.message?.content || '';
      // Could store token usage from data.usage
      return content;
    } catch (error: any) {
      if (error.response) {
        throw new Error(`AI service failed: ${error.response.status} - ${error.response.data?.error?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Stream chat completion (optional future feature).
   */
  async *chatStream(messages: ChatMessage[], onChunk?: (chunk: string) => void): AsyncGenerator<string, void, unknown> {
    const systemPrompt = this.config.systemPrompt || '你是一个专业的客服助手。';

    const payload = {
      model: this.config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      stream: true,
    };

    const response = await this.client.post('/chat/completions', payload, {
      responseType: 'stream',
    });

    for await (const chunk of response.data) {
      const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              onChunk?.(content);
              yield content;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }

  /**
   * Check health of AI service.
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Simple models list call to test connectivity
      await this.client.get('/models', {
        params: {},
        // Don't throw on 404/405 (some providers don't have /models)
      });
      return true;
    } catch (error: any) {
      if (error.response && error.response.status < 500) {
        // Acceptable - API reachable but endpoint might not exist
        return true;
      }
      return false;
    }
  }
}
