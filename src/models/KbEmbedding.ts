import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { KbChunk } from './KbChunk';

@Entity('kb_embeddings')
export class KbEmbedding {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => KbChunk)
  @JoinColumn({ name: 'chunk_id' })
  chunk: KbChunk;

  @Column({ type: 'vector' })
  embedding: number[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
