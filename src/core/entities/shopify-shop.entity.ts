import {
  Entity,
  Column, BaseEntity, PrimaryColumn, BeforeInsert,
} from 'typeorm';

@Entity('shopify_shops', { schema: 'public' })
export class ShopifyShop extends BaseEntity{
  @PrimaryColumn({ type: 'varchar', length: 20, unique: true })
  shop_code: string;

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

  @Column({ type: 'varchar', length: 255, nullable: true })
  installation_token: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  fingerprint: string;

  @BeforeInsert()
  async generateShopCode() {
    if (!this.shop_code) {
      this.shop_code = await this.generateUniqueShopCode();
    }
  }


  private async generateUniqueShopCode(): Promise<string> {
    let shopCode: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 100;

    while (!isUnique && attempts < maxAttempts) {
      shopCode = this.createShopCode();

      const existingShop = await ShopifyShop.findOne({
        where: { shop_code: shopCode }
      });

      if (!existingShop) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new Error('Không thể tạo shop_code unique sau nhiều lần thử');
    }

    // @ts-ignore
    return shopCode;
  }


  private createShopCode(): string {
    const now = new Date();
    const day = now.getDate();

    const dayLetter = String.fromCharCode(65 + ((day - 1) % 26)); // A-Z

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = dayLetter;

    for (let i = 0; i < 19; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  }
}