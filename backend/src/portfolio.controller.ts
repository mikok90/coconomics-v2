import { Controller, Get, Post, Body, Param, UseGuards, Query, Delete } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { StockPriceService } from './stock-price.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { User } from './user.decorator';

@Controller('portfolio')
@UseGuards(JwtAuthGuard)
export class PortfolioController {
  constructor(
    private readonly portfolioService: PortfolioService,
    private readonly stockPriceService: StockPriceService
  ) {}

  // Helper method to get portfolio ID for authenticated user
  private async getPortfolioId(userId: number): Promise<number> {
    const portfolio = await this.portfolioService.getPortfolioByUser(userId);
    return portfolio.id;
  }

  @Get('me')
  async getPortfolio(@User() user: any) {
    const portfolioId = await this.getPortfolioId(user.id);
    return this.portfolioService.getPortfolio(portfolioId);
  }

  @Get('me/positions')
  async getPositions(@User() user: any) {
    const portfolioId = await this.getPortfolioId(user.id);
    return this.portfolioService.getPositions(portfolioId);
  }

  @Get('me/live-prices')
  async getLivePrices(@User() user: any) {
    const portfolioId = await this.getPortfolioId(user.id);
    return this.portfolioService.updateLivePrices(portfolioId);
  }

  @Get('stock/:symbol/quote')
  async getStockQuote(@Param('symbol') symbol: string) {
    return this.stockPriceService.getQuote(symbol);
  }

  @Get('stock/:symbol/chart')
  async getStockChart(
    @Param('symbol') symbol: string,
    @Query('range') range: string = '1d'
  ) {
    return this.stockPriceService.getChartData(symbol, range);
  }

  @Get('stock/:symbol/recommendation')
  async getRecommendation(@Param('symbol') symbol: string) {
    return this.stockPriceService.getRecommendation(symbol);
  }

  @Get('stock/:symbol/rule-of-40')
  async getRuleOf40(@Param('symbol') symbol: string) {
    const data = await this.stockPriceService.calculateRuleOf40(symbol);

    // Transform snake_case to camelCase for frontend
    const classification = data.classification || 'POOR';
    // Convert EXCELLENT -> Excellent, POOR -> Poor, etc.
    const rating = classification.charAt(0).toUpperCase() + classification.slice(1).toLowerCase();

    return {
      revenueGrowth: data.revenue_growth_percent || 0,
      profitMargin: data.profit_margin_percent || 0,
      ruleOf40Score: data.rule_of_40_score || 0,
      rating: rating,
      description: this.getRuleOf40Description(data)
    };
  }

  private getRuleOf40Description(data: any): string {
    const score = data.rule_of_40_score || 0;
    if (score >= 40) {
      return `Excellent performance with ${score.toFixed(1)}% score. Revenue growth and profitability are well balanced.`;
    } else if (score >= 25) {
      return `Good performance with ${score.toFixed(1)}% score. Company is on a solid growth trajectory.`;
    } else if (score >= 10) {
      return `Fair performance with ${score.toFixed(1)}% score. Room for improvement in growth or profitability.`;
    } else {
      return `Poor performance with ${score.toFixed(1)}% score. Company needs significant improvement.`;
    }
  }

  @Post('me/optimize')
  async optimizePortfolio(
    @User() user: any,
    @Body() body: { riskFreeRate?: number }
  ) {
    const portfolioId = await this.getPortfolioId(user.id);
    return this.portfolioService.optimizePortfolio(portfolioId, body.riskFreeRate);
  }

  @Post('me/rebalance')
  async calculateRebalancing(@User() user: any) {
    const portfolioId = await this.getPortfolioId(user.id);
    return this.portfolioService.calculateRebalancing(portfolioId);
  }

  @Post('me/execute-rebalance')
  async executeRebalancing(
    @User() user: any,
    @Body() body: { actions: any[] }
  ) {
    const portfolioId = await this.getPortfolioId(user.id);
    return this.portfolioService.executeRebalancing(portfolioId, body.actions);
  }

  @Get('me/history')
  async getRebalanceHistory(@User() user: any) {
    const portfolioId = await this.getPortfolioId(user.id);
    return this.portfolioService.getRebalanceHistory(portfolioId);
  }

  @Get('position/:id/rebalancing')
  async getRebalancingRecommendations(@Param('id') id: number) {
    const position = await this.portfolioService.getPosition(id);

    const valueAveraging = this.stockPriceService.calculateValueAveraging(
      parseFloat(position.quantity.toString()),
      parseFloat(position.avgBuyPrice.toString()),
      parseFloat(position.currentPrice.toString()),
      1 // months since start
    );

    const thresholdRebalancing = this.stockPriceService.calculateThresholdRebalancing(
      parseFloat(position.quantity.toString()),
      parseFloat(position.avgBuyPrice.toString()),
      parseFloat(position.currentPrice.toString())
    );

    return {
      valueAveraging,
      thresholdRebalancing
    };
  }

  @Post('me/add-position')
  async addPosition(
    @User() user: any,
    @Body() body: {
      symbol: string;
      quantity: number;
      avgBuyPrice: number;
    }
  ) {
    const portfolioId = await this.getPortfolioId(user.id);
    return this.portfolioService.addPosition(portfolioId, body);
  }

  @Delete('position/:id')
  async deletePosition(@Param('id') id: number) {
    return this.portfolioService.deletePosition(id);
  }

  @Post('position/:id/sell')
  async sellShares(
    @Param('id') id: number,
    @Body() body: { quantity: number }
  ) {
    return this.portfolioService.sellShares(id, body.quantity);
  }

  @Post('me/update-prices')
  async updatePrices(@User() user: any) {
    const portfolioId = await this.getPortfolioId(user.id);
    return this.portfolioService.updateCurrentPrices(portfolioId);
  }

  @Post('me/deposit')
  async depositCash(
    @User() user: any,
    @Body() body: { amount: number; notes?: string }
  ) {
    const portfolioId = await this.getPortfolioId(user.id);
    return this.portfolioService.depositCash(portfolioId, body.amount, body.notes);
  }

  @Post('me/withdraw')
  async withdrawCash(
    @User() user: any,
    @Body() body: { amount: number; notes?: string }
  ) {
    const portfolioId = await this.getPortfolioId(user.id);
    return this.portfolioService.withdrawCash(portfolioId, body.amount, body.notes);
  }

  @Get('me/transactions')
  async getTransactions(
    @User() user: any,
    @Query('limit') limit?: number
  ) {
    const portfolioId = await this.getPortfolioId(user.id);
    return this.portfolioService.getTransactions(portfolioId, limit);
  }

  @Delete('me/transactions')
  async deleteAllTransactions(@User() user: any) {
    const portfolioId = await this.getPortfolioId(user.id);
    return this.portfolioService.deleteAllTransactions(portfolioId);
  }

  @Post('me/snapshot')
  async createSnapshot(@User() user: any) {
    const portfolioId = await this.getPortfolioId(user.id);
    return this.portfolioService.createSnapshot(portfolioId);
  }

  @Get('me/performance')
  async getPerformance(
    @User() user: any,
    @Query('days') days?: number
  ) {
    const portfolioId = await this.getPortfolioId(user.id);
    return this.portfolioService.getPerformanceData(portfolioId, days || 30);
  }

  @Delete('me/performance')
  async resetPerformance(@User() user: any) {
    const portfolioId = await this.getPortfolioId(user.id);
    return this.portfolioService.deleteAllSnapshots(portfolioId);
  }
}
