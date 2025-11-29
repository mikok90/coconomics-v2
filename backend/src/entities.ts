import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ nullable: true })
  name: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Portfolio, portfolio => portfolio.user)
  portfolios: Portfolio[];
}

@Entity('portfolios')
export class Portfolio {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'total_value', default: 0 })
  totalValue: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, user => user.portfolios)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Position, position => position.portfolio)
  positions: Position[];
}

@Entity('assets')
export class Asset {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 10 })
  symbol: string;

  @Column()
  name: string;

  @Column({ name: 'asset_type', default: 'stock' })
  assetType: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Position, position => position.asset)
  positions: Position[];

  @OneToMany(() => PriceHistory, price => price.asset)
  priceHistory: PriceHistory[];
}

@Entity('positions')
export class Position {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'portfolio_id' })
  portfolioId: number;

  @Column({ name: 'asset_id' })
  assetId: number;

  @Column({ type: 'decimal', precision: 15, scale: 6 })
  quantity: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'avg_buy_price' })
  avgBuyPrice: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'current_price', nullable: true })
  currentPrice: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, name: 'current_weight', nullable: true })
  currentWeight: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, name: 'target_weight', nullable: true })
  targetWeight: number;

  @Column({ name: 'last_updated', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastUpdated: Date;

  @ManyToOne(() => Portfolio, portfolio => portfolio.positions)
  @JoinColumn({ name: 'portfolio_id' })
  portfolio: Portfolio;

  @ManyToOne(() => Asset, asset => asset.positions)
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;
}

@Entity('price_history')
export class PriceHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'asset_id' })
  assetId: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  price: number;

  @Column({ type: 'date' })
  date: Date;

  @ManyToOne(() => Asset, asset => asset.priceHistory)
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;
}

@Entity('rebalance_history')
export class RebalanceHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'portfolio_id' })
  portfolioId: number;

  @Column({ name: 'asset_id' })
  assetId: number;

  @Column({ length: 10 })
  action: string;

  @Column({ type: 'decimal', precision: 5, scale: 4, name: 'from_weight', nullable: true })
  fromWeight: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, name: 'to_weight', nullable: true })
  toWeight: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  amount: number;

  @Column({ name: 'executed_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  executedAt: Date;

  @ManyToOne(() => Portfolio)
  @JoinColumn({ name: 'portfolio_id' })
  portfolio: Portfolio;

  @ManyToOne(() => Asset)
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;
}

@Entity('optimization_results')
export class OptimizationResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'portfolio_id' })
  portfolioId: number;

  @Column({ type: 'decimal', precision: 8, scale: 6, name: 'expected_return', nullable: true })
  expectedReturn: number;

  @Column({ type: 'decimal', precision: 8, scale: 6, nullable: true })
  risk: number;

  @Column({ type: 'decimal', precision: 8, scale: 4, name: 'sharpe_ratio', nullable: true })
  sharpeRatio: number;

  @Column({ type: 'jsonb' })
  weights: Record<string, number>;

  @Column({ name: 'calculated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  calculatedAt: Date;

  @ManyToOne(() => Portfolio)
  @JoinColumn({ name: 'portfolio_id' })
  portfolio: Portfolio;
}
