import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';

@Entity('statistics')
@Unique(['statDate', 'statType', 'metricKey'])
export class Statistics {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'stat_date', type: 'date' })
  statDate: Date;

  @Column({ name: 'stat_type', type: 'varchar', length: 64 })
  statType: string;

  @Column({ name: 'metric_key', type: 'varchar', length: 128 })
  metricKey: string;

  @Column({ name: 'metric_value', type: 'double precision' })
  metricValue: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
