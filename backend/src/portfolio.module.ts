import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { PortfolioOptimizationService } from './portfolio-optimization.service';
import { StockPriceService } from './stock-price.service';
import { Portfolio, Position, Asset, PriceHistory, RebalanceHistory, OptimizationResult, Transaction, PortfolioSnapshot } from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Portfolio,
      Position,
      Asset,
      PriceHistory,
      RebalanceHistory,
      OptimizationResult,
      Transaction,
      PortfolioSnapshot,
    ]),
  ],
  controllers: [PortfolioController],
  providers: [PortfolioService, PortfolioOptimizationService, StockPriceService],
})
export class PortfolioModule {}
