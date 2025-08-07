import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('shop_info')
export class ShopInfo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  shop_domain: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  shop_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  shop_email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  currency: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  timezone: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  plan_name: string;

  @Column({ type: 'text', nullable: true })
  access_token: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'json', nullable: true })
  additional_data: any;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}