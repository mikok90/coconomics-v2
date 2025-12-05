import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PortfolioModule } from './portfolio.module';
import { AuthModule } from './auth.module';
import { User, Portfolio, Asset, Position, PriceHistory, RebalanceHistory, OptimizationResult, Transaction } from './entities';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'coconomics',
      entities: [User, Portfolio, Asset, Position, PriceHistory, RebalanceHistory, OptimizationResult, Transaction],
      synchronize: true, // Auto-create/update tables
      logging: false, // Disable in production for performance
      ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
    }),
    AuthModule,
    PortfolioModule,
  ],
})
export class AppModule {}

