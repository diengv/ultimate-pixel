import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('shopify_shops', { schema: 'public' })
export class ShopifyShop {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  shop: string;

  @Column({ type: 'varchar', length: 255 })
  host: string;

  @Column({ type: 'varchar', length: 64 })
  hmac: string;

  @Column({ type: 'varchar', length: 20 })
  timestamp: string;

  @Column({ type: 'varchar', length: 50, default: 'installing' })
  status: string; // installing, authorized, failed

  @Column({ type: 'varchar', length:1000, nullable: true })
  note: string;

  @Column({ type: 'timestamp', nullable: true })
  installation_started_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  authorization_completed_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}