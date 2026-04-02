/**
 * User Service
 *
 * Handles user CRUD operations and WeCom user synchronization.
 */

import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { WeComService } from '../wecom/WeComService';
import type { User as UserType } from '../skill/types';

export class UserService {
  private wecomService: WeComService;

  constructor(
    private dataSource: typeof AppDataSource,
    wecomService: WeComService
  ) {
    this.wecomService = wecomService;
  }

  /**
   * Get existing user or create from WeCom.
   */
  async getOrCreateUser(wecomUserId: string): Promise<UserType> {
    const userRepo = this.dataSource.getRepository(User);

    let user = await userRepo.findOne({ where: { wecomUserId } });
    if (user) return this.mapUser(user);

    // Try to fetch from WeCom
    try {
      const wecomUser = await this.wecomService.getUser(wecomUserId);
      user = userRepo.create({
        wecomUserId: wecomUser.userid,
        name: wecomUser.name,
        avatarUrl: wecomUser.avatar || null,
        mobile: wecomUser.mobile || null,
        email: wecomUser.email || null,
        departmentIds: wecomUser.department,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await userRepo.save(user);
    } catch (error) {
      // Create placeholder user if WeCom fetch fails
      user = userRepo.create({
        wecomUserId,
        name: 'WeChat User',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await userRepo.save(user);
    }

    return this.mapUser(user);
  }

  /**
   * Get user by internal database ID.
   */
  async getUser(userId: string): Promise<UserType | null> {
    const userRepo = this.dataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) return null;
    return this.mapUser(user);
  }

  /**
   * Update user information.
   */
  async updateUser(userId: string, updates: Partial<UserType>): Promise<UserType> {
    const userRepo = this.dataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    Object.assign(user, updates, { updatedAt: new Date() });
    await userRepo.save(user);

    return this.mapUser(user);
  }

  /**
   * Get all users with pagination.
   */
  async getAllUsers(page: number = 1, limit: number = 50): Promise<{ users: UserType[]; total: number }> {
    const userRepo = this.dataSource.getRepository(User);
    const [users, total] = await userRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      users: users.map(this.mapUser),
      total,
    };
  }

  /**
   * Map ORM User entity to API type.
   */
  private mapUser(user: User): UserType {
    return {
      id: user.id,
      wecomUserId: user.wecomUserId,
      name: user.name,
      avatarUrl: user.avatarUrl,
      mobile: user.mobile,
      email: user.email,
      departmentIds: user.departmentIds,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
