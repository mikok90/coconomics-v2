import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Portfolio, Position, Asset, PriceHistory, RebalanceHistory, OptimizationResult, Transaction, PortfolioSnapshot } from './entities';
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
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
    @InjectRepository(PortfolioSnapshot)
    private snapshotRepo: Repository<PortfolioSnapshot>,
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
   * Get portfolio by user ID
   */
  async getPortfolioByUser(userId: number) {
    const portfolio = await this.portfolioRepo.findOne({
      where: { userId },
      relations: ['positions', 'positions.asset']
    });

    if (!portfolio) {
      throw new NotFoundException('Portfolio not found for user');
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
      // Validate stock symbol exists by fetching live quote
      // This will throw an error if the symbol is invalid
      const quote = await this.stockPriceService.getQuote(data.symbol);

      asset = this.assetRepo.create({
        symbol: data.symbol,
        name: data.symbol,
        assetType: 'stock'
      });
      await this.assetRepo.save(asset);
    }

    // Fetch current live price - this also validates the stock symbol
    // If stock is invalid, this will throw an error and stop the process
    const quote = await this.stockPriceService.getQuote(data.symbol);
    const currentPrice = quote.price;

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

      const totalCostCalc = (oldQty * oldAvg) + (newQty * newAvg);
      const totalQuantity = oldQty + newQty;

      position.quantity = totalQuantity;
      position.avgBuyPrice = totalCostCalc / totalQuantity;
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

    // Record BUY transaction
    const portfolio = await this.portfolioRepo.findOne({ where: { id: portfolioId } });
    const totalCost = data.quantity * data.avgBuyPrice;
    const currentCash = parseFloat(portfolio.cashBalance.toString());
    const newCash = currentCash - totalCost;
    portfolio.cashBalance = newCash;
    await this.portfolioRepo.save(portfolio);

    await this.recordTransaction(
      portfolioId,
      'BUY',
      totalCost,
      newCash,
      data.symbol,
      data.quantity,
      data.avgBuyPrice,
      `Bought ${data.quantity} shares of ${data.symbol} at $${data.avgBuyPrice.toFixed(2)}`
    );

    // Create snapshot for performance tracking (don't fail the operation if this fails)
    try {
      await this.createSnapshot(portfolioId);
    } catch (error) {
      console.error('Failed to create snapshot after adding position:', error);
      // Don't throw - snapshot creation shouldn't fail the stock purchase
    }

    // Return position with asset info
    return this.positionRepo.findOne({
      where: { id: position.id },
      relations: ['asset']
    });
  }

  /**
   * Delete a position - removes stock completely as if purchase never happened
   * Adjusts totalDeposits to remove the purchase cost from cost basis
   * NO CASH REFUND - this just removes the stock from tracking
   * Use sellShares() to get money back at current market price
   */
  async deletePosition(positionId: number) {
    const position = await this.positionRepo.findOne({
      where: { id: positionId },
      relations: ['asset']
    });

    if (!position) {
      throw new NotFoundException('Position not found');
    }

    const portfolioId = position.portfolioId;

    // Calculate the original purchase cost
    const quantity = parseFloat(position.quantity.toString());
    const avgBuyPrice = parseFloat(position.avgBuyPrice.toString());
    const purchaseCost = quantity * avgBuyPrice;

    // Get portfolio to adjust totalDeposits (cost basis)
    const portfolio = await this.portfolioRepo.findOne({ where: { id: portfolioId } });
    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    // Adjust totalDeposits: remove the purchase cost from cost basis
    // This makes it as if the purchase never happened (no profit, no loss impact)
    const currentDeposits = parseFloat(portfolio.totalDeposits.toString());
    portfolio.totalDeposits = Math.max(0, currentDeposits - purchaseCost);
    await this.portfolioRepo.save(portfolio);

    // Delete the position completely (no trace, no transaction record)
    await this.positionRepo.delete(positionId);
    await this.updatePortfolioWeights(portfolioId);

    // Update portfolio value snapshot to reflect the removal
    try {
      await this.createSnapshot(portfolioId);
    } catch (error) {
      console.error('Failed to create snapshot after deleting position:', error);
      // Don't throw - snapshot creation shouldn't fail the deletion
    }

    return {
      message: 'Position removed - purchase cost removed from cost basis (no profit/loss impact)',
      removedSymbol: position.asset.symbol,
      removedQuantity: quantity,
      purchaseCostRemoved: purchaseCost
    };
  }

  /**
   * Sell shares from a position
   */
  async sellShares(positionId: number, quantityToSell: number) {
    const position = await this.positionRepo.findOne({
      where: { id: positionId },
      relations: ['asset']
    });

    if (!position) {
      throw new NotFoundException('Position not found');
    }

    const currentQuantity = parseFloat(position.quantity.toString());

    if (quantityToSell <= 0) {
      throw new Error('Quantity to sell must be greater than 0');
    }

    if (quantityToSell > currentQuantity) {
      throw new Error(`Cannot sell ${quantityToSell} shares. You only have ${currentQuantity} shares.`);
    }

    const portfolioId = position.portfolioId;

    // Get portfolio to update cash balance
    const portfolio = await this.portfolioRepo.findOne({ where: { id: portfolioId } });
    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    // Calculate proceeds from sale
    const currentPrice = parseFloat(position.currentPrice.toString());
    const proceeds = quantityToSell * currentPrice;

    // Add proceeds to cash balance
    const currentCash = parseFloat(portfolio.cashBalance.toString());
    const newCash = currentCash + proceeds;
    portfolio.cashBalance = newCash;
    await this.portfolioRepo.save(portfolio);

    // Record SELL transaction
    await this.recordTransaction(
      portfolioId,
      'SELL',
      proceeds,
      newCash,
      position.asset.symbol,
      quantityToSell,
      currentPrice,
      `Sold ${quantityToSell} shares of ${position.asset.symbol} at $${currentPrice.toFixed(2)}`
    );

    // Calculate remaining quantity
    const remainingQuantity = currentQuantity - quantityToSell;

    // If position reaches 0 or very close to 0, delete it entirely
    if (remainingQuantity <= 0.0001) {
      await this.positionRepo.delete(positionId);
      await this.updatePortfolioWeights(portfolioId);

      // Create snapshot for performance tracking
      try {
        await this.createSnapshot(portfolioId);
      } catch (error) {
        console.error('Failed to create snapshot after selling all shares:', error);
        // Don't throw - snapshot creation shouldn't fail the sale
      }

      return {
        message: `All shares sold successfully. Position removed from portfolio. Proceeds: $${proceeds.toFixed(2)}`,
        position: null,
        proceeds,
        cashBalance: newCash
      };
    }

    // Otherwise, just reduce the quantity
    position.quantity = remainingQuantity;
    position.lastUpdated = new Date();

    await this.positionRepo.save(position);
    await this.updatePortfolioWeights(portfolioId);

    // Create snapshot for performance tracking
    try {
      await this.createSnapshot(portfolioId);
    } catch (error) {
      console.error('Failed to create snapshot after selling partial shares:', error);
      // Don't throw - snapshot creation shouldn't fail the sale
    }

    return {
      message: `Shares sold successfully. Proceeds: $${proceeds.toFixed(2)}`,
      position: await this.positionRepo.findOne({
        where: { id: positionId },
        relations: ['asset']
      }),
      proceeds,
      cashBalance: newCash
    };
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

        // If position reaches 0 or very close to 0, delete it
        const finalQuantity = parseFloat(position.quantity.toString());
        if (finalQuantity <= 0.0001) {
          await this.positionRepo.delete(position.id);
        } else {
          position.currentWeight = action.targetWeight;
          await this.positionRepo.save(position);
        }
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

  /**
   * Helper: Record a transaction
   */
  private async recordTransaction(
    portfolioId: number,
    type: string,
    amount: number,
    cashBalanceAfter: number,
    symbol?: string,
    quantity?: number,
    price?: number,
    notes?: string
  ) {
    const transaction = this.transactionRepo.create({
      portfolioId,
      type,
      amount,
      symbol,
      quantity,
      price,
      cashBalanceAfter,
      notes
    });

    return this.transactionRepo.save(transaction);
  }

  /**
   * Deposit cash to portfolio
   */
  async depositCash(portfolioId: number, amount: number, notes?: string) {
    if (amount <= 0) {
      throw new Error('Deposit amount must be greater than 0');
    }

    const portfolio = await this.portfolioRepo.findOne({ where: { id: portfolioId } });

    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    const currentCash = parseFloat(portfolio.cashBalance.toString());
    const currentDeposits = parseFloat(portfolio.totalDeposits.toString());
    const newCash = currentCash + amount;
    const newDeposits = currentDeposits + amount;

    portfolio.cashBalance = newCash;
    portfolio.totalDeposits = newDeposits;
    await this.portfolioRepo.save(portfolio);

    await this.recordTransaction(portfolioId, 'DEPOSIT', amount, newCash, null, null, null, notes);

    // Create snapshot for performance tracking
    try {
      await this.createSnapshot(portfolioId);
    } catch (error) {
      console.error('Failed to create snapshot after deposit:', error);
      // Don't throw - snapshot creation shouldn't fail the deposit
    }

    return {
      success: true,
      cashBalance: newCash,
      totalDeposits: newDeposits,
      message: `Deposited $${amount.toFixed(2)}`
    };
  }

  /**
   * Withdraw cash from portfolio
   */
  async withdrawCash(portfolioId: number, amount: number, notes?: string) {
    if (amount <= 0) {
      throw new Error('Withdrawal amount must be greater than 0');
    }

    const portfolio = await this.portfolioRepo.findOne({ where: { id: portfolioId } });

    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    const currentCash = parseFloat(portfolio.cashBalance.toString());

    if (amount > currentCash) {
      throw new Error(`Insufficient cash. Available: $${currentCash.toFixed(2)}`);
    }

    const currentWithdrawals = parseFloat(portfolio.totalWithdrawals.toString());
    const newCash = currentCash - amount;
    const newWithdrawals = currentWithdrawals + amount;

    portfolio.cashBalance = newCash;
    portfolio.totalWithdrawals = newWithdrawals;
    await this.portfolioRepo.save(portfolio);

    await this.recordTransaction(portfolioId, 'WITHDRAWAL', amount, newCash, null, null, null, notes);

    // Create snapshot for performance tracking
    try {
      await this.createSnapshot(portfolioId);
    } catch (error) {
      console.error('Failed to create snapshot after withdrawal:', error);
      // Don't throw - snapshot creation shouldn't fail the withdrawal
    }

    return {
      success: true,
      cashBalance: newCash,
      totalWithdrawals: newWithdrawals,
      message: `Withdrew $${amount.toFixed(2)}`
    };
  }

  /**
   * Get transaction history
   */
  async getTransactions(portfolioId: number, limit: number = 50) {
    return this.transactionRepo.find({
      where: { portfolioId },
      order: { createdAt: 'DESC' },
      take: limit
    });
  }

  /**
   * Delete all transactions for a portfolio
   */
  async deleteAllTransactions(portfolioId: number) {
    await this.transactionRepo.delete({ portfolioId });
    return {
      success: true,
      message: 'All transactions deleted successfully'
    };
  }

  /**
   * Create a portfolio value snapshot
   */
  async createSnapshot(portfolioId: number) {
    const portfolio = await this.portfolioRepo.findOne({
      where: { id: portfolioId },
      relations: ['positions']
    });

    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    // Calculate positions value
    const positions = await this.getPositions(portfolioId);
    const positionsValue = positions.reduce((sum, pos) => {
      const qty = parseFloat(pos.quantity.toString());
      const price = parseFloat(pos.currentPrice?.toString() || '0');
      return sum + (qty * price);
    }, 0);

    const cashBalance = parseFloat(portfolio.cashBalance.toString());
    const totalValue = positionsValue + cashBalance;

    const snapshot = this.snapshotRepo.create({
      portfolioId,
      totalValue,
      cashBalance,
      positionsValue,
      snapshotDate: new Date()
    });

    return this.snapshotRepo.save(snapshot);
  }

  /**
   * Get portfolio performance data (value over time)
   * Includes total deposits/withdrawals for accurate profit/loss calculation
   */
  async getPerformanceData(portfolioId: number, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const snapshots = await this.snapshotRepo
      .createQueryBuilder('snapshot')
      .where('snapshot.portfolio_id = :portfolioId', { portfolioId })
      .andWhere('snapshot.snapshot_date >= :startDate', { startDate })
      .orderBy('snapshot.snapshot_date', 'ASC')
      .getMany();

    // Get portfolio info for deposits/withdrawals
    const portfolio = await this.portfolioRepo.findOne({ where: { id: portfolioId } });

    return {
      snapshots: snapshots.map(snapshot => ({
        date: snapshot.snapshotDate,
        totalValue: parseFloat(snapshot.totalValue.toString()),
        cashBalance: parseFloat(snapshot.cashBalance.toString()),
        positionsValue: parseFloat(snapshot.positionsValue.toString())
      })),
      totalDeposits: portfolio ? parseFloat(portfolio.totalDeposits.toString()) : 0,
      totalWithdrawals: portfolio ? parseFloat(portfolio.totalWithdrawals.toString()) : 0
    };
  }

  /**
   * Delete all portfolio snapshots (reset performance data)
   * Use this to clear corrupted performance data and start fresh
   */
  async deleteAllSnapshots(portfolioId: number) {
    const result = await this.snapshotRepo
      .createQueryBuilder()
      .delete()
      .from(PortfolioSnapshot)
      .where('portfolio_id = :portfolioId', { portfolioId })
      .execute();

    return {
      message: 'All portfolio snapshots deleted successfully',
      deletedCount: result.affected || 0
    };
  }
}
