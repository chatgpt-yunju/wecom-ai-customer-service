/**
 * Admin Service
 *
 * Provides administrative queries and metrics.
 */

import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { Message } from '../models/Message';
import { Agent } from '../models/Agent';
import { Statistics } from '../models/Statistics';
import type { PaginatedResult } from '../skill/types';

export class AdminService {
  constructor(private dataSource: typeof AppDataSource) {}

  /**
   * Get users with pagination and optional filters.
   */
  async getUsers(page: number = 1, limit: number = 50, filters?: Record<string, any>): Promise<PaginatedResult<any>> {
    const userRepo = this.dataSource.getRepository(User);
    const query = userRepo.createQueryBuilder('user');

    if (filters) {
      // Apply filters as needed
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          query.andWhere(`user.${key} = :${key}`, { [key]: value });
        }
      });
    }

    const [users, total] = await query
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get sessions with filters.
   */
  async getSessions(filters?: Record<string, any>): Promise<PaginatedResult<any>> {
    const sessionRepo = this.dataSource.getRepository(Session);
    const query = sessionRepo
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.user', 'user')
      .leftJoinAndSelect('session.agent', 'agent')
      .orderBy('session.lastMessageAt', 'DESC');

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (key === 'status') {
          query.andWhere('session.status = :status', { status: value });
        } else if (key === 'userId') {
          query.andWhere('session.userId = :userId', { userId: value });
        } else if (key === 'agentId') {
          query.andWhere('session.agentId = :agentId', { agentId: value });
        }
      });
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 50;

    const [sessions, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: sessions,
      total,
      page: page as number,
      limit: limit as number,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get detailed session with messages.
   */
  async getSessionDetails(sessionId: string) {
    const sessionRepo = this.dataSource.getRepository(Session);
    const messageRepo = this.dataSource.getRepository(Message);

    const session = await sessionRepo.findOne({
      where: { sessionId },
      relations: ['user', 'agent'],
    });

    if (!session) return null;

    const messages = await messageRepo.find({
      where: { sessionId: session.id },
      order: { createdAt: 'ASC' },
    });

    return {
      session,
      messages,
    };
  }

  /**
   * Get agents.
   */
  async getAgents(page: number = 1, limit: number = 50): Promise<PaginatedResult<any>> {
    const agentRepo = this.dataSource.getRepository(Agent);
    const [agents, total] = await agentRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: agents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get statistics for the last N days.
   */
  async getStatistics(days: number = 7): Promise<Record<string, any>> {
    const statsRepo = this.dataSource.getRepository(Statistics);
    const stats = await statsRepo.find({
      where: {
        statDate: {
          $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        },
      },
      order: { statDate: 'DESC' },
    });

    // Group by date and type
    const grouped: Record<string, any> = {};
    for (const stat of stats) {
      const dateKey = stat.statDate.toISOString().split('T')[0];
      if (!grouped[dateKey]) grouped[dateKey] = {};
      grouped[dateKey][stat.metricKey] = stat.metricValue;
    }

    return grouped;
  }

  /**
   * Get system configuration (all key-value pairs).
   */
  async getSystemConfig(): Promise<Record<string, any>> {
    const configRepo = this.dataSource.getRepository(require('../models/Config').Config);
    const configs = await configRepo.find();
    const result: Record<string, any> = {};
    for (const config of configs) {
      try {
        result[config.configKey] = JSON.parse(config.configValue);
      } catch {
        result[config.configKey] = config.configValue;
      }
    }
    return result;
  }

  /**
   * Update a system configuration key.
   */
  async updateSystemConfig(key: string, value: any): Promise<void> {
    const configRepo = this.dataSource.getRepository(require('../models/Config').Config);
    const config = await configRepo.findOneBy({ configKey: key });

    if (config) {
      config.configValue = JSON.stringify(value);
      config.updatedAt = new Date();
      await configRepo.save(config);
    } else {
      configRepo.create({
        configKey: key,
        configValue: JSON.stringify(value),
        description: 'User configured',
      });
      await configRepo.save(config);
    }
  }
}
