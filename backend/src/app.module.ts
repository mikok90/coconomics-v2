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
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'coconomics',
      entities: [User, Portfolio, Asset, Position, PriceHistory, RebalanceHistory, OptimizationResult],
      synchronize: false,
      logging: true,
    }),
    PortfolioModule,
  ],
})
export class AppModule {}
