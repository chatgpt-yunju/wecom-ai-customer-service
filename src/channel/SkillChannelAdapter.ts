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
  private subscribedChannels: Map<string, Set<string>> = new Map(); // channelId -> set of skillIds
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
    if (!this.channelManager) {
      throw new Error('ChannelAdapter not initialized');
    }

    let skillSet = this.subscribedChannels.get(channelId);
    if (!skillSet) {
      skillSet = new Set<string>();
      this.subscribedChannels.set(channelId, skillSet);
    }
    skillSet.add(skillId);
    console.log(`Skill ${skillId} subscribed to channel ${channelId}`);
  }

  async unsubscribe(channelId: string, skillId: string): Promise<void> {
    const skillSet = this.subscribedChannels.get(channelId);
    if (skillSet) {
      skillSet.delete(skillId);
      if (skillSet.size === 0) {
        this.subscribedChannels.delete(channelId);
      }
    }
  }

  async sendThroughChannel(channelId: string, message: Partial<ChannelMessage>): Promise<boolean> {
    if (!this.channelManager) {
      throw new Error('ChannelAdapter not initialized');
    }

    // Check subscription via any skill ID (since adapter may handle multiple skills)
    const isSubscribed = Array.from(this.subscribedChannels.values()).some((skillIds) => skillIds.has(this.skillId));
    if (!isSubscribed) {
      throw new Error(`Skill ${this.skillId} not subscribed to any channel`);
    }

    // Build full ChannelMessage
    const channelMsg: ChannelMessage = {
      id: message.id || `outbound-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      channelId,
      channelName: channelId,
      channelType: 'custom',
      timestamp: message.timestamp || new Date(),
      direction: 'outbound',
      from: message.from || { id: this.skillId, name: 'AI Skill', type: 'bot' },
      to: message.to || { id: '', name: '', type: 'user' },
      content: message.content || { type: 'text', text: '' },
      raw: message.raw || {},
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
    // Check if this skill adapter should handle this message
    // 1. Check if message is routed to any skill this adapter manages
    const skillIdsForChannel = this.subscribedChannels.get(message.channelId);
    if (!skillIdsForChannel || skillIdsForChannel.size === 0) {
      return; // No skills subscribed to this channel
    }

    // If message has explicit skillId, check if it's one we manage
    if (message.skillId && !skillIdsForChannel.has(message.skillId)) {
      return; // Not for this adapter's skills
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

      // Forward to skill (always use this.skillId as the skill instance)
      const response = await this.skill.onMessageReceived(skillEvent);

      // If skill produced a response, send it back through the same channel
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
