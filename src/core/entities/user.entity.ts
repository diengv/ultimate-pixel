import { Entity, Column, BeforeInsert } from 'typeorm';
import { BaseEntity } from '../database/base.entity';
import { CryptoUtil } from '../../common/utils/crypto.util';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @BeforeInsert()
  async hashPassword() {
    this.password = await CryptoUtil.hashPassword(this.password);
  }

  async validatePassword(password: string): Promise<boolean> {
    return CryptoUtil.verifyPassword(password, this.password);
  }
}