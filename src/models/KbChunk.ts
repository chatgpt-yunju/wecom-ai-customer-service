import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { KnowledgeBase } from './KnowledgeBase';

@Entity('kb_chunks')
export class KbChunk {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => KnowledgeBase)
  @JoinColumn({ name: 'kb_id' })
  kb: KnowledgeBase;

  @Column({ name: 'chunk_index', type: 'integer' })
  chunkIndex: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'token_count', type: 'integer', nullable: true })
  tokenCount: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
