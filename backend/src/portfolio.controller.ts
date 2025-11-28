import { Controller, Get, Post, Body, Param, UseGuards, Query, Delete } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { StockPriceService } from './stock-price.service';

@Controller('portfolio')
export class PortfolioController {
  constructor(
    private readonly portfolioService: PortfolioService,
    private readonly stockPriceService: StockPriceService
  ) {}

  @Get(':id')
  async getPortfolio(@Param('id') id: number) {
    return this.portfolioService.getPortfolio(id);
  }

  @Get(':id/positions')
  async getPositions(@Param('id') id: number) {
    return this.portfolioService.getPositions(id);
  }

  @Get(':id/live-prices')
  async getLivePrices(@Param('id') id: number) {
    return this.portfolioService.updateLivePrices(id);
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

  @Post(':id/optimize')
  async optimizePortfolio(
    @Param('id') id: number,
    @Body() body: { riskFreeRate?: number }
  ) {
    return this.portfolioService.optimizePortfolio(id, body.riskFreeRate);
  }

  @Post(':id/rebalance')
  async calculateRebalancing(@Param('id') id: number) {
    return this.portfolioService.calculateRebalancing(id);
  }

  @Post(':id/execute-rebalance')
  async executeRebalancing(
    @Param('id') id: number,
    @Body() body: { actions: any[] }
  ) {
    return this.portfolioService.executeRebalancing(id, body.actions);
  }

  @Get(':id/history')
  async getRebalanceHistory(@Param('id') id: number) {
    return this.portfolioService.getRebalanceHistory(id);
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

  @Post(':id/add-position')
  async addPosition(
    @Param('id') id: number,
    @Body() body: {
      symbol: string;
      quantity: number;
      avgBuyPrice: number;
    }
  ) {
    return this.portfolioService.addPosition(id, body);
  }

  @Delete('position/:id')
  async deletePosition(@Param('id') id: number) {
    return this.portfolioService.deletePosition(id);
  }

  @Post(':id/update-prices')
  async updatePrices(@Param('id') id: number) {
    return this.portfolioService.updateCurrentPrices(id);
  }
}
