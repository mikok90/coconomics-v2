import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PortfolioModule } from './portfolio.module';
import { User, Portfolio, Asset, Position, PriceHistory, RebalanceHistory, OptimizationResult } from './entities';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [User, Portfolio, Asset, Position, PriceHistory, RebalanceHistory, OptimizationResult],
      synchronize: true, // Auto-create tables on first run
      logging: true,
      ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
    }),
    PortfolioModule,
  ],
})
export class AppModule {}
