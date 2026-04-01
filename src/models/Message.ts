import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Session } from './Session';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Session)
  @JoinColumn({ name: 'session_id' })
  session: Session;

  @Column({ name: 'message_id', type: 'varchar', length: 128, unique: true })
  messageId: string;

  @Column({ name: 'msg_type', type: 'varchar', length: 32 })
  msgType: 'text' | 'image' | 'file' | 'voice';

  @Column({ type: 'text', nullable: true })
  content: string | null;

  @Column({ name: 'media_id', type: 'varchar', length: 255, nullable: true })
  mediaId: string | null;

  @Column({ name: 'sender_type', type: 'varchar', length: 32 })
  senderType: 'user' | 'ai' | 'agent';

  @Column({ name: 'sender_id', type: 'varchar', length: 128, nullable: true })
  senderId: string | null;

  @Column({ name: 'ai_model_used', type: 'varchar', length: 128, nullable: true })
  aiModelUsed: string | null;

  @Column({ name: 'token_count', type: 'integer', nullable: true })
  tokenCount: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
