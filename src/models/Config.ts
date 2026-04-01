import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('configs')
export class Config {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'config_key', type: 'varchar', length: 255, unique: true })
  configKey: string;

  @Column({ name: 'config_value', type: 'text', nullable: true })
  configValue: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
