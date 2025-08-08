import {
  BaseEntity,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tenants')
export class Tenant extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  domain: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  planName: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Physical database schema name dedicated to this tenant
  @Column({ type: 'varchar', length: 64 })
  schemaName: string;

  // Optional tracking of current schema version applied to this tenant
  @Column({ type: 'varchar', length: 50, nullable: true })
  currentSchemaVersion: string | null;

  // Arbitrary metadata/extensions for the tenant
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}