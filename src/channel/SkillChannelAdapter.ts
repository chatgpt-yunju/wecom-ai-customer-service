/**
 * Skill Channel Adapter
 *
 * Connects OpenClawSkill to the Channel Manager.
 * Handles routing messages between channels and the skill.
 */

import { EventEmitter } from 'events';
import type {
  ISkillChannelAdapter,
  IChannelManager,
  ChannelMessage,
  ChannelStatus,
} from './types';
import { IOpenClawSkill } from '../skill/interfaces/IOpenClawSkill';
import type { MessageEvent, SkillCapabilities } from '../skill/types';

export class SkillChannelAdapter extends EventEmitter implements ISkillChannelAdapter {
  private channelManager: IChannelManager | null = null;
  private skill: IOpenClawSkill;
  private subscribedChannels: Set<string> = new Set();
  private skillId: string;

  constructor(skill: IOpenClawSkill, skillId?: string) {
    super();
    this.skill = skill;
    this.skillId = skillId || 'default-skill';
  }

  async initialize(channelManager: IChannelManager): Promise<void> {
    this.channelManager = channelManager;

    // Listen for messages from channel manager
    this.channelManager.on('message', this.handleInboundMessage.bind(this));

    // Get skill capabilities and register routing
    const capabilities = await this.skill.getCapabilities();
    console.log(`SkillChannelAdapter initialized for skill: ${this.skillId}`, capabilities);
  }

  async subscribe(channelId: string, skillId: string): Promise<void> {
    if (skillId !== this.skillId) {
      throw new Error(`Cannot subscribe to skill ${skillId} (this adapter handles ${this.skillId})`);
    }

    if (!this.channelManager) {
      throw new Error('ChannelAdapter not initialized');
    }

    this.subscribedChannels.add(channelId);
    console.log(`Skill ${this.skillId} subscribed to channel ${channelId}`);
  }

  async unsubscribe(channelId: string, skillId: string): Promise<void> {
    if (skillId !== this.skillId) {
      return;
    }
    this.subscribedChannels.delete(channelId);
  }

  async sendThroughChannel(channelId: string, message: Partial<ChannelMessage>): Promise<boolean> {
    if (!this.channelManager) {
      throw new Error('ChannelAdapter not initialized');
    }

    if (!this.subscribedChannels.has(channelId)) {
      throw new Error(`Skill not subscribed to channel ${channelId}`);
    }

    // Convert skill response to ChannelMessage
    const channelMsg: ChannelMessage = {
      id: `outbound-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      channelId,
      channelName: channelId,
      channelType: 'custom',
      timestamp: new Date(),
      direction: 'outbound',
      from: {
        id: this.skillId,
        name: 'AI Skill',
        type: 'bot',
      },
      to: message.to || { id: '', name: '', type: 'user' },
      content: {
        type: 'text',
        text: message.content || '',
      },
      raw: {},
      metadata: message.metadata || {},
    };

    return this.channelManager.routeOutbound(channelMsg);
  }

  async getChannels(): Promise<ChannelStatus[]> {
    if (!this.channelManager) {
      return [];
    }
    return this.channelManager.getStatus();
  }

  private async handleInboundMessage(message: ChannelMessage): Promise<void> {
    // Check if this skill is responsible for this message
    if (message.skillId && message.skillId !== this.skillId) {
      return; // Not for this skill
    }

    // Check subscription
    if (this.subscribedChannels.size > 0 && !this.subscribedChannels.has(message.channelId)) {
      return; // Not subscribed to this channel
    }

    try {
      // Convert ChannelMessage to skill's MessageEvent format
      const skillEvent: MessageEvent = {
        type: message.content.type,
        content: message.content.text || '',
        userId: message.from.id,
        sessionId: message.sessionId,
        timestamp: message.timestamp,
        metadata: {
          ...message.metadata,
          channelId: message.channelId,
          channelName: message.channelName,
          raw: message.raw,
        },
      };

      // Forward to skill
      const response = await this.skill.onMessageReceived(skillEvent);

      // If skill produced a response and we have a channel to reply on,
      // send the response back through that channel
      if (response && message.channelId) {
        const outboundMsg: Partial<ChannelMessage> = {
          to: message.from,
          content: {
            type: 'text',
            text: response.content,
          },
          metadata: {
            sessionId: response.sessionId,
            skillId: this.skillId,
            ...response.metadata,
          },
        };

        await this.sendThroughChannel(message.channelId, outboundMsg);
      }
    } catch (error) {
      console.error('Error handling inbound message:', error);
      this.emit('error', error);
    }
  }
}
