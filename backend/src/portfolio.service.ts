import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Portfolio, Position, Asset, PriceHistory, RebalanceHistory, OptimizationResult } from './entities';
import { PortfolioOptimizationService } from './portfolio-optimization.service';
import { StockPriceService } from './stock-price.service';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(Portfolio)
    private portfolioRepo: Repository<Portfolio>,
    @InjectRepository(Position)
    private positionRepo: Repository<Position>,
    @InjectRepository(Asset)
    private assetRepo: Repository<Asset>,
    @InjectRepository(PriceHistory)
    private priceHistoryRepo: Repository<PriceHistory>,
    @InjectRepository(RebalanceHistory)
    private rebalanceHistoryRepo: Repository<RebalanceHistory>,
    @InjectRepository(OptimizationResult)
    private optimizationResultRepo: Repository<OptimizationResult>,
    private optimizationService: PortfolioOptimizationService,
    private stockPriceService: StockPriceService
  ) {}

  /**
   * Get portfolio with all positions
   */
  async getPortfolio(portfolioId: number) {
    const portfolio = await this.portfolioRepo.findOne({
      where: { id: portfolioId },
      relations: ['positions', 'positions.asset']
    });

    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    return portfolio;
  }

  /**
   * Get all positions for a portfolio
   */
  async getPositions(portfolioId: number) {
    const positions = await this.positionRepo.find({
      where: { portfolioId },
      relations: ['asset']
    });

    return positions;
  }

  /**
   * Get single position by ID
   */
  async getPosition(positionId: number) {
    const position = await this.positionRepo.findOne({
      where: { id: positionId },
      relations: ['asset']
    });

    if (!position) {
      throw new NotFoundException('Position not found');
    }

    return position;
  }
  /**
   * Add or update position in portfolio
   */
  async addPosition(
    portfolioId: number,
    data: { symbol: string; quantity: number; avgBuyPrice: number }
  ) {
    // Find or create asset
    let asset = await this.assetRepo.findOne({ where: { symbol: data.symbol } });

    if (!asset) {
      // Fetch live quote to get asset name
      try {
        const quote = await this.stockPriceService.getQuote(data.symbol);
        asset = this.assetRepo.create({
          symbol: data.symbol,
          name: data.symbol,
          assetType: 'stock'
        });
      } catch (error) {
        asset = this.assetRepo.create({
          symbol: data.symbol,
          name: data.symbol,
          assetType: 'stock'
        });
      }
      await this.assetRepo.save(asset);
    }

    // Fetch current live price
    let currentPrice = data.avgBuyPrice;
    try {
      const quote = await this.stockPriceService.getQuote(data.symbol);
      currentPrice = quote.price;
    } catch (error) {
      console.error(`Failed to fetch live price for ${data.symbol}:`, error.message);
    }

    // Check if position exists
    let position = await this.positionRepo.findOne({
      where: { portfolioId, assetId: asset.id }
    });

    if (position) {
      // Update existing position - calculate weighted average
      // CRITICAL: Convert database DECIMAL strings to numbers!
      const oldQty = parseFloat(position.quantity.toString());
      const oldAvg = parseFloat(position.avgBuyPrice.toString());
      const newQty = parseFloat(data.quantity.toString());
      const newAvg = parseFloat(data.avgBuyPrice.toString());

      const totalCost = (oldQty * oldAvg) + (newQty * newAvg);
      const totalQuantity = oldQty + newQty;

      position.quantity = totalQuantity;
      position.avgBuyPrice = totalCost / totalQuantity;
      position.currentPrice = currentPrice; // Update with live price
      position.lastUpdated = new Date();
    } else {
      // Create new position with live price
      position = this.positionRepo.create({
        portfolioId,
        assetId: asset.id,
        quantity: data.quantity,
        avgBuyPrice: data.avgBuyPrice,
        currentPrice: currentPrice, // Use live price
        lastUpdated: new Date()
      });
    }

    await this.positionRepo.save(position);
    await this.updatePortfolioWeights(portfolioId);

    // Return position with asset info
    return this.positionRepo.findOne({
      where: { id: position.id },
      relations: ['asset']
    });
  }

  /**
   * Delete a position
   */
  async deletePosition(positionId: number) {
    const position = await this.positionRepo.findOne({
      where: { id: positionId }
    });

    if (!position) {
      throw new NotFoundException('Position not found');
    }

    const portfolioId = position.portfolioId;
    await this.positionRepo.delete(positionId);
    await this.updatePortfolioWeights(portfolioId);

    return { message: 'Position deleted successfully' };
  }

  /**
   * Update current weights based on current prices
   */
  async updatePortfolioWeights(portfolioId: number) {
    const positions = await this.positionRepo.find({
      where: { portfolioId }
    });

    // Calculate total portfolio value
    let totalValue = 0;
    for (const position of positions) {
      const positionValue = position.quantity * (position.currentPrice || position.avgBuyPrice);
      totalValue += positionValue;
    }

    // Update weights
    for (const position of positions) {
      const positionValue = position.quantity * (position.currentPrice || position.avgBuyPrice);
      position.currentWeight = totalValue > 0 ? positionValue / totalValue : 0;
      await this.positionRepo.save(position);
    }

    // Update portfolio total value
    await this.portfolioRepo.update(portfolioId, { totalValue });

    return { totalValue, positions };
  }

  /**
   * Update current prices from external API (placeholder)
   */
  async updateCurrentPrices(portfolioId: number) {
    const positions = await this.positionRepo.find({
      where: { portfolioId },
      relations: ['asset']
    });

    // TODO: Fetch real prices from API (Alpha Vantage, Yahoo Finance, etc.)
    // For now, just update timestamp
    for (const position of positions) {
      position.lastUpdated = new Date();
      await this.positionRepo.save(position);
    }

    await this.updatePortfolioWeights(portfolioId);

    return positions;
  }

  /**
   * Update live prices from Yahoo Finance
   */
  async updateLivePrices(portfolioId: number) {
    const positions = await this.positionRepo.find({
      where: { portfolioId },
      relations: ['asset']
    });

    if (positions.length === 0) {
      return [];
    }

    // Get all symbols
    const symbols = positions.map(p => p.asset.symbol);

    // Fetch live quotes
    const quotes = await this.stockPriceService.getQuotes(symbols);

    // Update positions with live prices
    for (const position of positions) {
      const quote = quotes[position.asset.symbol];
      if (quote) {
        position.currentPrice = quote.price;
        position.lastUpdated = new Date();
        await this.positionRepo.save(position);
      }
    }

    await this.updatePortfolioWeights(portfolioId);

    return positions;
  }

  /**
   * Optimize portfolio using Markowitz
   */
  async optimizePortfolio(portfolioId: number, riskFreeRate: number = 0.02) {
    const positions = await this.positionRepo.find({
      where: { portfolioId },
      relations: ['asset']
    });

    if (positions.length === 0) {
      throw new NotFoundException('No positions in portfolio');
    }

    // Get historical returns for each asset
    const assetData = await Promise.all(
      positions.map(async (position) => {
        const returns = await this.calculateHistoricalReturns(position.assetId);
        return {
          symbol: position.asset.symbol,
          returns,
          currentWeight: position.currentWeight || 0
        };
      })
    );

    // Run optimization
    const result = this.optimizationService.optimizePortfolio(assetData, riskFreeRate);

    // Save optimization result
    const optimizationResult = this.optimizationResultRepo.create({
      portfolioId,
      expectedReturn: result.expectedReturn,
      risk: result.risk,
      sharpeRatio: result.sharpeRatio,
      weights: result.weights
    });
    await this.optimizationResultRepo.save(optimizationResult);

    // Update target weights in positions
    for (const position of positions) {
      const targetWeight = result.weights[position.asset.symbol] || 0;
      position.targetWeight = targetWeight;
      await this.positionRepo.save(position);
    }

    return {
      optimization: result,
      positions: await this.getPositions(portfolioId)
    };
  }

  /**
   * Calculate rebalancing actions
   */
  async calculateRebalancing(portfolioId: number) {
    const positions = await this.positionRepo.find({
      where: { portfolioId },
      relations: ['asset']
    });

    if (positions.length === 0) {
      throw new NotFoundException('No positions in portfolio');
    }

    // Check if we have target weights
    const hasTargets = positions.some(p => p.targetWeight !== null);
    if (!hasTargets) {
      throw new Error('Run optimization first to set target weights');
    }

    // Prepare data for rebalancing algorithm
    const assetData = positions.map(position => ({
      symbol: position.asset.symbol,
      returns: [], // Not needed for rebalancing
      currentWeight: position.currentWeight || 0,
      targetWeight: position.targetWeight || 0
    }));

    const targetWeights: Record<string, number> = {};
    positions.forEach(p => {
      targetWeights[p.asset.symbol] = p.targetWeight || 0;
    });

    // Calculate rebalancing actions
    const actions = this.optimizationService.calculateRebalancing(assetData, targetWeights);

    // Calculate dollar amounts
    const portfolio = await this.portfolioRepo.findOne({ where: { id: portfolioId } });
    const totalValue = portfolio?.totalValue || 0;

    const actionsWithAmounts = actions.map(action => {
      const dollarAmount = action.amount * totalValue;
      const position = positions.find(p => p.asset.symbol === action.symbol);
      const currentPrice = position?.currentPrice || position?.avgBuyPrice || 0;
      const shares = currentPrice > 0 ? dollarAmount / currentPrice : 0;

      return {
        ...action,
        dollarAmount,
        shares: Math.abs(shares),
        currentPrice
      };
    });

    return actionsWithAmounts;
  }

  /**
   * Execute rebalancing and save to history
   */
  async executeRebalancing(portfolioId: number, actions: any[]) {
    const portfolio = await this.portfolioRepo.findOne({ where: { id: portfolioId } });
    
    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    // Save to rebalance history
    for (const action of actions) {
      if (action.action === 'HOLD') continue;

      const asset = await this.assetRepo.findOne({ where: { symbol: action.symbol } });
      if (!asset) continue;

      const rebalanceRecord = this.rebalanceHistoryRepo.create({
        portfolioId,
        assetId: asset.id,
        action: action.action,
        fromWeight: action.currentWeight,
        toWeight: action.targetWeight,
        amount: action.dollarAmount
      });

      await this.rebalanceHistoryRepo.save(rebalanceRecord);

      // Update position
      const position = await this.positionRepo.findOne({
        where: { portfolioId, assetId: asset.id }
      });

      if (position) {
        if (action.action === 'BUY') {
          position.quantity += action.shares;
        } else if (action.action === 'SELL') {
          position.quantity -= action.shares;
        }
        
        position.currentWeight = action.targetWeight;
        await this.positionRepo.save(position);
      }
    }

    return { success: true, actions };
  }

  /**
   * Get rebalancing history
   */
  async getRebalanceHistory(portfolioId: number) {
    return this.rebalanceHistoryRepo.find({
      where: { portfolioId },
      relations: ['asset'],
      order: { executedAt: 'DESC' },
      take: 50
    });
  }

  /**
   * Calculate historical returns from price history
   */
  private async calculateHistoricalReturns(assetId: number): Promise<number[]> {
    const prices = await this.priceHistoryRepo.find({
      where: { assetId },
      order: { date: 'ASC' }
    });

    if (prices.length < 2) {
      // If no historical data, return dummy returns (should fetch real data in production)
      return this.generateDummyReturns();
    }

    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      const prevPrice = parseFloat(prices[i - 1].price.toString());
      const currPrice = parseFloat(prices[i].price.toString());
      const dailyReturn = (currPrice - prevPrice) / prevPrice;
      returns.push(dailyReturn);
    }

    return returns;
  }

  /**
   * Generate dummy returns for testing (should be replaced with real data)
   */
  private generateDummyReturns(days: number = 252): number[] {
    const returns: number[] = [];
    const meanReturn = 0.0003; // ~7.5% annual
    const volatility = 0.02; // 2% daily vol
    
    for (let i = 0; i < days; i++) {
      // Simple random walk
      const randomReturn = meanReturn + volatility * (Math.random() - 0.5) * 2;
      returns.push(randomReturn);
    }
    
    return returns;
  }

  /**
   * Create new portfolio
   */
  async createPortfolio(userId: number, name: string) {
    const portfolio = this.portfolioRepo.create({
      userId,
      name,
      totalValue: 0
    });

    return this.portfolioRepo.save(portfolio);
  }

  /**
   * Get latest optimization result
   */
  async getLatestOptimization(portfolioId: number) {
    return this.optimizationResultRepo.findOne({
      where: { portfolioId },
      order: { calculatedAt: 'DESC' }
    });
  }
}
