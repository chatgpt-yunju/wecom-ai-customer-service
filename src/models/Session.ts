import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from './User';
import { Message } from './Message';
import { Agent } from './Agent';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'session_id', type: 'varchar', length: 128, unique: true })
  sessionId: string;

  @Column({ type: 'varchar', length: 32, default: 'active' })
  status: 'active' | 'closed' | 'transferred';

  @ManyToOne(() => Agent, { nullable: true })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt: Date | null;

  @UpdateDateColumn({ name: 'last_message_at' })
  lastMessageAt: Date;

  @OneToMany(() => Message, message => message.session)
  messages: Message[];
}
