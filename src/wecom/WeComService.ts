/**
 * WeCom API Service
 *
 * Handles communication with WeCom (WeChat Work) API.
 * Provides user lookup and message sending capabilities.
 */

import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

export interface WeComConfig {
  corpId: string;
  corpSecret: string;
  token: string;
  encodingAESKey: string;
  agentId: number;
  apiHost?: string;
}

export interface WeComUser {
  userid: string;
  name: string;
  avatar?: string;
  mobile?: string;
  email?: string;
  department: number[];
  // ... other fields
}

export class WeComService {
  private config: WeComConfig;
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: WeComConfig) {
    this.config = {
      apiHost: config.apiHost || 'https://qyapi.weixin.qq.com/cgi-bin',
      ...config,
    };
    this.client = axios.create({
      baseURL: this.config.apiHost,
      timeout: 10000,
    });
  }

  /**
   * Get valid access token, refreshing if needed.
   */
  private async getAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (this.accessToken && now < this.tokenExpiresAt - 300) {
      return this.accessToken; // Still valid for 5+ min
    }

    const response = await this.client.get('/gettoken', {
      params: {
        corpid: this.config.corpId,
        corpsecret: this.config.corpSecret,
      },
    });

    if (response.data.errcode !== 0) {
      throw new Error(`WeCom API error: ${response.data.errmsg}`);
    }

    this.accessToken = response.data.access_token;
    this.tokenExpiresAt = now + response.data.expires_in;
    return this.accessToken;
  }

  /**
   * Get user information from WeCom.
   */
  async getUser(userId: string): Promise<WeComUser> {
    const token = await this.getAccessToken();
    const response = await this.client.get('/user/get', {
      params: {
        access_token: token,
        userid: userId,
      },
    });

    if (response.data.errcode !== 0) {
      throw new Error(`WeCom get user error: ${response.data.errmsg}`);
    }

    return response.data as WeComUser;
  }

  /**
   * Send text message to a user.
   */
  async sendMessage(userId: string, content: string, msgType: 'text' | 'image' | 'file' | 'voice' = 'text', mediaId?: string): Promise<boolean> {
    const token = await this.getAccessToken();

    const payload: any = {
      touser: userId,
      msgtype: msgType,
      agentid: this.config.agentId,
    };

    if (msgType === 'text') {
      payload.text = { content };
    } else if (msgType === 'image') {
      payload.image = { media_id: mediaId };
    } else if (msgType === 'file') {
      payload.file = { media_id: mediaId };
    } else if (msgType === 'voice') {
      payload.voice = { media_id: mediaId };
    }

    const response = await this.client.post('/message/send', payload, {
      params: { access_token: token },
    });

    return response.data.errcode === 0;
  }

  /**
   * Check API health.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      return !!token;
    } catch {
      return false;
    }
  }
}
