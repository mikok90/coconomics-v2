import { Injectable } from '@nestjs/common';
import axios from 'axios';

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  volume?: number;
}

export interface ChartData {
  timestamp: number[];
  prices: number[];
}

@Injectable()
export class StockPriceService {
  private readonly FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'd4lpiu1r01qr851psmh0d4lpiu1r01qr851psmhg';
  private readonly FINNHUB_API = 'https://finnhub.io/api/v1';

  /**
   * Get real-time stock quote with volume using Finnhub
   */
  async getQuote(symbol: string): Promise<StockQuote> {
    try {
      if (!this.FINNHUB_API_KEY) {
        throw new Error('FINNHUB_API_KEY not configured');
      }

      const url = `${this.FINNHUB_API}/quote`;
      console.log(`Fetching quote for ${symbol} from Finnhub`);

      const response = await axios.get(url, {
        params: {
          symbol: symbol,
          token: this.FINNHUB_API_KEY
        },
        timeout: 10000
      });

      const data = response.data;

      // Finnhub response: {c: current, pc: previous close, h: high, l: low, o: open, t: timestamp}
      const currentPrice = data.c;
      const previousClose = data.pc;
      const change = currentPrice - previousClose;
      const changePercent = (change / previousClose) * 100;

      console.log(`Successfully fetched quote for ${symbol}: $${currentPrice}`);

      return {
        symbol: symbol,
        price: currentPrice,
        change: change,
        changePercent: changePercent,
        previousClose: previousClose,
        volume: 0 // Finnhub quote endpoint doesn't include volume
      };
    } catch (error: any) {
      console.error(`Error fetching quote for ${symbol}:`, error.response?.data || error.message);
      throw new Error(`Failed to fetch quote for ${symbol}`);
    }
  }

  /**
   * Get multiple quotes at once
   */
  async getQuotes(symbols: string[]): Promise<Record<string, StockQuote>> {
    const quotes: Record<string, StockQuote> = {};
    
    await Promise.all(
      symbols.map(async (symbol) => {
        try {
          quotes[symbol] = await this.getQuote(symbol);
        } catch (error) {
          console.error(`Failed to get quote for ${symbol}`);
        }
      })
    );

    return quotes;
  }

  /**
   * Get historical chart data using Finnhub
   */
  async getChartData(symbol: string, range: string = '1d'): Promise<ChartData> {
    try {
      if (!this.FINNHUB_API_KEY) {
        throw new Error('FINNHUB_API_KEY not configured');
      }

      const url = `${this.FINNHUB_API}/stock/candle`;
      const { resolution, from, to } = this.getTimeRangeForFinnhub(range);

      console.log(`Fetching chart from Finnhub: ${symbol}, range: ${range}, resolution: ${resolution}`);

      const response = await axios.get(url, {
        params: {
          symbol: symbol,
          resolution: resolution,
          from: from,
          to: to,
          token: this.FINNHUB_API_KEY
        },
        timeout: 10000
      });

      console.log(`Finnhub response status: ${response.status}`);

      if (!response.data || response.data.s === 'no_data' || !response.data.c) {
        console.warn(`No chart data available for ${symbol}`);
        return { timestamp: [], prices: [] };
      }

      // Finnhub returns: {c: [close prices], t: [timestamps], o: [open], h: [high], l: [low], v: [volume], s: status}
      const timestamps = response.data.t || [];
      const prices = response.data.c || [];

      console.log(`Successfully fetched ${prices.length} prices for ${symbol}`);

      return {
        timestamp: timestamps,
        prices: prices.filter((p: number) => p !== null && p !== undefined)
      };
    } catch (error: any) {
      console.error(`Error fetching chart for ${symbol}:`, error.response?.data || error.message);
      // Return empty data instead of throwing - don't crash the server
      return {
        timestamp: [],
        prices: []
      };
    }
  }

  /**
   * Convert range string to Finnhub resolution and timestamps
   */
  private getTimeRangeForFinnhub(range: string): { resolution: string; from: number; to: number } {
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    let from: number;
    let resolution: string;

    switch (range) {
      case '1d':
        from = now - 86400; // 1 day ago
        resolution = '5'; // 5 minute candles
        break;
      case '5d':
        from = now - (5 * 86400); // 5 days ago
        resolution = '15'; // 15 minute candles
        break;
      case '1mo':
        from = now - (30 * 86400); // 30 days ago
        resolution = 'D'; // Daily candles
        break;
      case '3mo':
        from = now - (90 * 86400); // 90 days ago
        resolution = 'D'; // Daily candles
        break;
      case '6mo':
        from = now - (180 * 86400); // 180 days ago
        resolution = 'D'; // Daily candles
        break;
      case '1y':
        from = now - (365 * 86400); // 365 days ago
        resolution = 'W'; // Weekly candles
        break;
      case '5y':
        from = now - (5 * 365 * 86400); // 5 years ago
        resolution = 'M'; // Monthly candles
        break;
      default:
        from = now - 86400;
        resolution = '5';
    }

    return { resolution, from, to: now };
  }

  /**
   * Value Averaging Algorithm
   * Calculates how much to buy/sell to reach target portfolio value
   */
  calculateValueAveraging(
    quantity: number,
    avgBuyPrice: number,
    currentPrice: number,
    monthsSinceStart: number = 1,
    targetMonthlyGrowth: number = 0.01 // 1% monthly growth target
  ): {
    action: 'BUY' | 'SELL' | 'HOLD';
    amount: string;
    shares: number;
    reason: string;
  } {
    const initialValue = quantity * avgBuyPrice;
    const targetValue = initialValue * Math.pow(1 + targetMonthlyGrowth, monthsSinceStart);
    const currentValue = quantity * currentPrice;
    const difference = currentValue - targetValue;
    
    if (Math.abs(difference) < initialValue * 0.02) { // Within 2% tolerance
      return {
        action: 'HOLD',
        amount: '€0',
        shares: 0,
        reason: `Portfolio on track (€${Math.abs(difference).toFixed(2)} from target)`
      };
    }
    
    if (difference > 0) {
      // Current value exceeds target - SELL
      const sharesToSell = Math.abs(difference) / currentPrice;
      return {
        action: 'SELL',
        amount: `€${Math.abs(difference).toFixed(2)}`,
        shares: parseFloat(sharesToSell.toFixed(2)),
        reason: `Portfolio €${difference.toFixed(2)} above target of €${targetValue.toFixed(2)}`
      };
    } else {
      // Current value below target - BUY
      const sharesToBuy = Math.abs(difference) / currentPrice;
      return {
        action: 'BUY',
        amount: `€${Math.abs(difference).toFixed(2)}`,
        shares: parseFloat(sharesToBuy.toFixed(2)),
        reason: `Portfolio €${Math.abs(difference).toFixed(2)} below target of €${targetValue.toFixed(2)}`
      };
    }
  }

  /**
   * Threshold Rebalancing Algorithm
   * Buy/sell based on % deviation from average price
   */
  calculateThresholdRebalancing(
    quantity: number,
    avgBuyPrice: number,
    currentPrice: number
  ): {
    action: 'BUY' | 'SELL' | 'HOLD';
    percentage: string;
    amount: string;
    shares: number;
    reason: string;
  } {
    const priceChange = ((currentPrice - avgBuyPrice) / avgBuyPrice) * 100;
    const currentValue = quantity * currentPrice;
    
    // Thresholds
    if (priceChange >= 20) {
      // +20% → Sell 40% of holdings
      const sharesToSell = quantity * 0.4;
      return {
        action: 'SELL',
        percentage: '40%',
        amount: `€${(sharesToSell * currentPrice).toFixed(2)}`,
        shares: parseFloat(sharesToSell.toFixed(2)),
        reason: `Price up ${priceChange.toFixed(1)}% from avg - take profits`
      };
    } else if (priceChange >= 10) {
      // +10% → Sell 20% of holdings
      const sharesToSell = quantity * 0.2;
      return {
        action: 'SELL',
        percentage: '20%',
        amount: `€${(sharesToSell * currentPrice).toFixed(2)}`,
        shares: parseFloat(sharesToSell.toFixed(2)),
        reason: `Price up ${priceChange.toFixed(1)}% from avg - lock gains`
      };
    } else if (priceChange <= -20) {
      // -20% → Buy €200 worth
      const buyAmount = 200;
      const sharesToBuy = buyAmount / currentPrice;
      return {
        action: 'BUY',
        percentage: '€200',
        amount: `€${buyAmount.toFixed(2)}`,
        shares: parseFloat(sharesToBuy.toFixed(2)),
        reason: `Price down ${Math.abs(priceChange).toFixed(1)}% - strong buy opportunity`
      };
    } else if (priceChange <= -10) {
      // -10% → Buy €100 worth
      const buyAmount = 100;
      const sharesToBuy = buyAmount / currentPrice;
      return {
        action: 'BUY',
        percentage: '€100',
        amount: `€${buyAmount.toFixed(2)}`,
        shares: parseFloat(sharesToBuy.toFixed(2)),
        reason: `Price down ${Math.abs(priceChange).toFixed(1)}% - average down`
      };
    } else {
      return {
        action: 'HOLD',
        percentage: '0%',
        amount: '€0',
        shares: 0,
        reason: `Price within normal range (${priceChange > 0 ? '+' : ''}${priceChange.toFixed(1)}%)`
      };
    }
  }

  /**
   * AI Summary of Technical Indicators & Oscillators
   * Returns simple BUY/SELL/HOLD based on all indicators
   */
  async getOscillatorSummary(symbol: string): Promise<{
    summary: 'STRONG BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG SELL';
    oscillators: { buy: number; sell: number; neutral: number };
    movingAverages: { buy: number; sell: number; neutral: number };
  }> {
    try {
      const data = await this.getChartData(symbol, '3mo');
      
      if (data.prices.length < 50) {
        return {
          summary: 'NEUTRAL',
          oscillators: { buy: 0, sell: 0, neutral: 0 },
          movingAverages: { buy: 0, sell: 0, neutral: 0 }
        };
      }

      const prices = data.prices;
      const currentPrice = prices[prices.length - 1];
      
      // Calculate all oscillators
      const rsi = this.calculateRSI(prices, 14);
      const macd = this.calculateMACD(prices);
      const bollinger = this.calculateBollingerBands(prices, 20, 2);
      const stochastic = this.calculateStochastic(prices, 14);
      const cci = this.calculateCCI(prices, 20);
      const momentum = this.calculateMomentum(prices, 10);
      
      // Calculate moving averages
      const sma10 = this.calculateSMA(prices, 10);
      const sma20 = this.calculateSMA(prices, 20);
      const sma30 = this.calculateSMA(prices, 30);
      const sma50 = this.calculateSMA(prices, 50);
      const sma100 = this.calculateSMA(prices, 100);
      const sma200 = this.calculateSMA(prices, 200);
      const ema10 = this.calculateEMA(prices, 10);
      const ema20 = this.calculateEMA(prices, 20);
      const ema30 = this.calculateEMA(prices, 30);
      const ema50 = this.calculateEMA(prices, 50);
      const ema100 = this.calculateEMA(prices, 100);
      const ema200 = this.calculateEMA(prices, 200);
      
      // Count oscillator signals
      let oscBuy = 0, oscSell = 0, oscNeutral = 0;
      
      // RSI - Industry standard thresholds
      if (rsi < 30) {
        oscBuy += 2;  // Strong oversold
      } else if (rsi < 40) {
        oscBuy++;  // Mild oversold
      } else if (rsi > 70) {
        oscSell += 2;  // Strong overbought
      } else if (rsi > 60) {
        oscSell++;  // Mild overbought
      } else {
        oscNeutral++;
      }
      
      // MACD
      if (macd.histogram > 0) oscBuy++;
      else if (macd.histogram < 0) oscSell++;
      else oscNeutral++;
      
      // Bollinger Bands
      const bbPosition = (currentPrice - bollinger.lower) / (bollinger.upper - bollinger.lower);
      if (bbPosition < 0.2) oscBuy++;
      else if (bbPosition > 0.8) oscSell++;
      else oscNeutral++;
      
      // Stochastic - Industry standard thresholds
      if (stochastic < 20) {
        oscBuy += 2;  // Strong oversold
      } else if (stochastic < 40) {
        oscBuy++;  // Mild oversold
      } else if (stochastic > 80) {
        oscSell += 2;  // Strong overbought
      } else if (stochastic > 60) {
        oscSell++;  // Mild overbought
      } else {
        oscNeutral++;
      }
      
      // CCI
      if (cci < -100) oscBuy++;
      else if (cci > 100) oscSell++;
      else oscNeutral++;
      
      // Momentum
      if (momentum > 2) oscBuy++;
      else if (momentum < -2) oscSell++;
      else oscNeutral++;
      
      // Count moving average signals
      let maBuy = 0, maSell = 0, maNeutral = 0;
      
      const mas = [sma10, sma20, sma30, sma50, sma100, sma200, ema10, ema20, ema30, ema50, ema100, ema200];
      
      mas.forEach(ma => {
        if (currentPrice > ma) maBuy++;
        else if (currentPrice < ma) maSell++;
        else maNeutral++;
      });
      
      // Calculate overall summary
      const totalBuy = oscBuy + maBuy;
      const totalSell = oscSell + maSell;
      const total = oscBuy + oscSell + oscNeutral + maBuy + maSell + maNeutral;
      
      const buyRatio = totalBuy / total;
      
      let summary: 'STRONG BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG SELL';
      
      if (buyRatio >= 0.75) summary = 'STRONG BUY';
      else if (buyRatio >= 0.6) summary = 'BUY';
      else if (buyRatio >= 0.4) summary = 'NEUTRAL';
      else if (buyRatio >= 0.25) summary = 'SELL';
      else summary = 'STRONG SELL';
      
      return {
        summary,
        oscillators: { buy: oscBuy, sell: oscSell, neutral: oscNeutral },
        movingAverages: { buy: maBuy, sell: maSell, neutral: maNeutral }
      };
    } catch (error) {
      console.error(`Error calculating oscillator summary for ${symbol}:`, error.message);
      return {
        summary: 'NEUTRAL',
        oscillators: { buy: 0, sell: 0, neutral: 0 },
        movingAverages: { buy: 0, sell: 0, neutral: 0 }
      };
    }
  }

  /**
   * Calculate CCI (Commodity Channel Index)
   */
  private calculateCCI(prices: number[], period: number = 20): number {
    if (prices.length < period) return 0;
    
    const recentPrices = prices.slice(-period);
    const typicalPrices = recentPrices; // Simplified - normally (high+low+close)/3
    const sma = typicalPrices.reduce((a, b) => a + b, 0) / period;
    const meanDeviation = typicalPrices.reduce((sum, price) => sum + Math.abs(price - sma), 0) / period;
    
    const cci = (typicalPrices[typicalPrices.length - 1] - sma) / (0.015 * meanDeviation);
    return cci;
  }

  /**
   * Advanced technical analysis with multiple indicators
   */
  async getRecommendation(symbol: string): Promise<{
    signal: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    reason: string;
    details: {
      rsi: number;
      macd: { signal: string; value: number };
      bollinger: { signal: string; position: string };
      stochastic: number;
      adx: number;
      trend: string;
      score: number;
    };
  }> {
    try {
      // Get multiple timeframes for better analysis
      const [daily, weekly] = await Promise.all([
        this.getChartData(symbol, '1mo'),
        this.getChartData(symbol, '3mo')
      ]);

      if (daily.prices.length < 50) {
        return {
          signal: 'HOLD',
          confidence: 0,
          reason: 'Insufficient data for analysis',
          details: null
        };
      }

      const prices = daily.prices;
      const currentPrice = prices[prices.length - 1];
      
      // Calculate all indicators
      const rsi = this.calculateRSI(prices, 14);
      const macd = this.calculateMACD(prices);
      const bollinger = this.calculateBollingerBands(prices, 20, 2);
      const stochastic = this.calculateStochastic(prices, 14);
      const adx = this.calculateADX(prices, 14);
      const sma20 = this.calculateSMA(prices, 20);
      const sma50 = this.calculateSMA(prices, 50);
      const ema12 = this.calculateEMA(prices, 12);
      const ema26 = this.calculateEMA(prices, 26);
      
      // Scoring system (-100 to +100)
      let score = 0;
      let signals: string[] = [];

      // RSI Analysis (weight: 20 points)
      if (rsi < 30) {
        score += 20;
        signals.push('RSI oversold (strong buy)');
      } else if (rsi < 40) {
        score += 10;
        signals.push('RSI approaching oversold');
      } else if (rsi > 70) {
        score -= 20;
        signals.push('RSI overbought (strong sell)');
      } else if (rsi > 60) {
        score -= 10;
        signals.push('RSI approaching overbought');
      }

      // MACD Analysis (weight: 20 points)
      if (macd.histogram > 0 && macd.signal === 'bullish_crossover') {
        score += 20;
        signals.push('MACD bullish crossover');
      } else if (macd.histogram > 0) {
        score += 10;
        signals.push('MACD positive momentum');
      } else if (macd.histogram < 0 && macd.signal === 'bearish_crossover') {
        score -= 20;
        signals.push('MACD bearish crossover');
      } else if (macd.histogram < 0) {
        score -= 10;
        signals.push('MACD negative momentum');
      }

      // Bollinger Bands Analysis (weight: 15 points)
      const bbPosition = (currentPrice - bollinger.lower) / (bollinger.upper - bollinger.lower);
      if (bbPosition < 0.1) {
        score += 15;
        signals.push('Price at lower Bollinger Band');
      } else if (bbPosition < 0.3) {
        score += 8;
        signals.push('Price near lower band');
      } else if (bbPosition > 0.9) {
        score -= 15;
        signals.push('Price at upper Bollinger Band');
      } else if (bbPosition > 0.7) {
        score -= 8;
        signals.push('Price near upper band');
      }

      // Stochastic Analysis (weight: 15 points)
      if (stochastic < 20) {
        score += 15;
        signals.push('Stochastic oversold');
      } else if (stochastic < 40) {
        score += 7;
        signals.push('Stochastic low');
      } else if (stochastic > 80) {
        score -= 15;
        signals.push('Stochastic overbought');
      } else if (stochastic > 60) {
        score -= 7;
        signals.push('Stochastic high');
      }

      // Moving Average Analysis (weight: 15 points)
      if (currentPrice > sma20 && sma20 > sma50) {
        score += 15;
        signals.push('Strong uptrend (price > SMA20 > SMA50)');
      } else if (currentPrice > sma20) {
        score += 8;
        signals.push('Short-term bullish');
      } else if (currentPrice < sma20 && sma20 < sma50) {
        score -= 15;
        signals.push('Strong downtrend (price < SMA20 < SMA50)');
      } else if (currentPrice < sma20) {
        score -= 8;
        signals.push('Short-term bearish');
      }

      // EMA Analysis (weight: 10 points)
      if (ema12 > ema26) {
        score += 10;
        signals.push('EMA12 above EMA26 (bullish)');
      } else {
        score -= 10;
        signals.push('EMA12 below EMA26 (bearish)');
      }

      // Support/Resistance Analysis (weight: 10 points)
      const { support, resistance } = this.detectSupportResistance(prices);
      const distanceToSupport = ((currentPrice - support) / support) * 100;
      const distanceToResistance = ((resistance - currentPrice) / currentPrice) * 100;
      
      if (distanceToSupport < 2) {
        score += 10;
        signals.push('Price near support (bounce expected)');
      } else if (distanceToResistance < 2) {
        score -= 10;
        signals.push('Price near resistance (rejection expected)');
      }

      // Price Pattern Analysis (weight: 5 points)
      const patterns = this.detectPricePatterns(prices);
      for (const pattern of patterns) {
        if (pattern.includes('bullish')) {
          score += 5;
          signals.push(pattern);
        } else if (pattern.includes('bearish')) {
          score -= 5;
          signals.push(pattern);
        }
      }

      // Momentum Analysis (weight: 5 points)
      const momentum = this.calculateMomentum(prices, 10);
      if (momentum > 5) {
        score += 5;
        signals.push('Strong positive momentum');
      } else if (momentum < -5) {
        score -= 5;
        signals.push('Strong negative momentum');
      }

      // ADX Trend Strength (modifier)
      let trendStrength = 'weak';
      if (adx > 50) {
        trendStrength = 'very strong';
        score *= 1.3; // Amplify signal in strong trends
      } else if (adx > 25) {
        trendStrength = 'strong';
        score *= 1.15;
      } else if (adx < 20) {
        trendStrength = 'no clear trend';
        score *= 0.7; // Reduce confidence in ranging market
      }

      // Determine final signal based on score
      let signal: 'BUY' | 'SELL' | 'HOLD';
      let confidence: number;
      let reason: string;

      // Adjust confidence based on market volatility
      const recentVolatility = this.calculateVolatility(prices.slice(-10));
      let volatilityMultiplier = 1.0;
      if (recentVolatility > 5) {
        volatilityMultiplier = 0.8; // Reduce confidence in highly volatile markets
      } else if (recentVolatility < 2) {
        volatilityMultiplier = 1.1; // Increase confidence in stable markets
      }

      if (score >= 40) {
        signal = 'BUY';
        confidence = Math.min(95, (60 + score * 0.5) * volatilityMultiplier);
        reason = `Strong buy (${trendStrength} trend, score: ${Math.round(score)}): ${signals.slice(0, 3).join(', ')}`;
      } else if (score >= 20) {
        signal = 'BUY';
        confidence = Math.min(80, (55 + score * 0.5) * volatilityMultiplier);
        reason = `Buy signal (score: ${Math.round(score)}): ${signals.slice(0, 2).join(', ')}`;
      } else if (score <= -40) {
        signal = 'SELL';
        confidence = Math.min(95, (60 + Math.abs(score) * 0.5) * volatilityMultiplier);
        reason = `Strong sell (${trendStrength} trend, score: ${Math.round(score)}): ${signals.slice(0, 3).join(', ')}`;
      } else if (score <= -20) {
        signal = 'SELL';
        confidence = Math.min(80, (55 + Math.abs(score) * 0.5) * volatilityMultiplier);
        reason = `Sell signal (score: ${Math.round(score)}): ${signals.slice(0, 2).join(', ')}`;
      } else {
        signal = 'HOLD';
        confidence = (50 - Math.abs(score)) * volatilityMultiplier;
        reason = `Neutral (score: ${Math.round(score)}): ${signals.length > 0 ? signals[0] : 'Mixed signals'}`;
      }

      return {
        signal,
        confidence: Math.round(confidence),
        reason,
        details: {
          rsi: Math.round(rsi * 10) / 10,
          macd: {
            signal: macd.signal,
            value: Math.round(macd.histogram * 100) / 100
          },
          bollinger: {
            signal: bbPosition < 0.2 ? 'buy' : bbPosition > 0.8 ? 'sell' : 'neutral',
            position: `${Math.round(bbPosition * 100)}%`
          },
          stochastic: Math.round(stochastic * 10) / 10,
          adx: Math.round(adx * 10) / 10,
          trend: trendStrength,
          score: Math.round(score)
        }
      };
    } catch (error) {
      console.error(`Analysis error for ${symbol}:`, error.message);
      return {
        signal: 'HOLD',
        confidence: 0,
        reason: 'Analysis unavailable',
        details: null
      };
    }
  }

  private getIntervalForRange(range: string): string {
    switch (range) {
      case '1d': return '5m';
      case '5d': return '15m';
      case '1mo': return '1d';
      case '3mo': return '1d';
      case '1y': return '1wk';
      default: return '1d';
    }
  }

  private calculateSMA(prices: number[], period: number): number {
    const slice = prices.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    
    const multiplier = 2 / (period + 1);
    let ema = this.calculateSMA(prices.slice(0, period), period);
    
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }
    
    return ema;
  }

  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;

    // Calculate price changes
    const changes: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }

    // Separate gains and losses
    const gains: number[] = changes.map(c => c > 0 ? c : 0);
    const losses: number[] = changes.map(c => c < 0 ? Math.abs(c) : 0);

    // Calculate initial averages (SMA for first period)
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

    // Use Wilder's smoothing for remaining periods
    for (let i = period; i < gains.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    }

    // Calculate RS and RSI
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return rsi;
  }

  private calculateMACD(prices: number[]): {
    macd: number;
    signal: string;
    histogram: number;
  } {
    if (prices.length < 26) {
      return { macd: 0, signal: 'neutral', histogram: 0 };
    }

    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macdLine = ema12 - ema26;
    
    // Calculate signal line (9-period EMA of MACD)
    const macdValues = [];
    for (let i = 26; i < prices.length; i++) {
      const slice = prices.slice(0, i + 1);
      const e12 = this.calculateEMA(slice, 12);
      const e26 = this.calculateEMA(slice, 26);
      macdValues.push(e12 - e26);
    }
    
    const signalLine = macdValues.length >= 9 
      ? this.calculateEMA(macdValues, 9)
      : macdLine;
    
    const histogram = macdLine - signalLine;
    
    // Determine signal
    let signal = 'neutral';
    if (histogram > 0 && macdValues.length >= 2) {
      const prevHistogram = macdValues[macdValues.length - 2] - signalLine;
      if (prevHistogram <= 0) {
        signal = 'bullish_crossover';
      }
    } else if (histogram < 0 && macdValues.length >= 2) {
      const prevHistogram = macdValues[macdValues.length - 2] - signalLine;
      if (prevHistogram >= 0) {
        signal = 'bearish_crossover';
      }
    }
    
    return { macd: macdLine, signal, histogram };
  }

  private calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): {
    upper: number;
    middle: number;
    lower: number;
  } {
    const sma = this.calculateSMA(prices, period);
    const slice = prices.slice(-period);
    
    // Calculate standard deviation
    const squaredDiffs = slice.map(price => Math.pow(price - sma, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    return {
      upper: sma + (standardDeviation * stdDev),
      middle: sma,
      lower: sma - (standardDeviation * stdDev)
    };
  }

  private calculateStochastic(prices: number[], period: number = 14): number {
    if (prices.length < period) return 50;
    
    const slice = prices.slice(-period);
    const currentPrice = prices[prices.length - 1];
    const lowest = Math.min(...slice);
    const highest = Math.max(...slice);
    
    if (highest === lowest) return 50;
    
    const stochastic = ((currentPrice - lowest) / (highest - lowest)) * 100;
    return stochastic;
  }

  private calculateADX(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 20;
    
    // Simplified ADX calculation
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(Math.abs(prices[i] - prices[i - 1]));
    }
    
    const recentChanges = changes.slice(-period);
    const avgChange = recentChanges.reduce((a, b) => a + b, 0) / period;
    const maxChange = Math.max(...recentChanges);
    
    // ADX approximation (0-100)
    const adx = (avgChange / maxChange) * 100;
    return Math.min(100, adx);
  }

  /**
   * Detect support and resistance levels
   */
  private detectSupportResistance(prices: number[]): {
    support: number;
    resistance: number;
  } {
    if (prices.length < 20) {
      return { support: Math.min(...prices), resistance: Math.max(...prices) };
    }

    const sorted = [...prices].sort((a, b) => a - b);
    const support = sorted[Math.floor(sorted.length * 0.25)]; // 25th percentile
    const resistance = sorted[Math.floor(sorted.length * 0.75)]; // 75th percentile

    return { support, resistance };
  }

  /**
   * Detect price action patterns
   */
  private detectPricePatterns(prices: number[]): string[] {
    if (prices.length < 10) return [];
    
    const patterns: string[] = [];
    const recentPrices = prices.slice(-10);
    
    // Double bottom pattern
    const min1 = Math.min(...recentPrices.slice(0, 5));
    const min2 = Math.min(...recentPrices.slice(5, 10));
    if (Math.abs(min1 - min2) / min1 < 0.03) {
      patterns.push('Double bottom (bullish)');
    }
    
    // Double top pattern
    const max1 = Math.max(...recentPrices.slice(0, 5));
    const max2 = Math.max(...recentPrices.slice(5, 10));
    if (Math.abs(max1 - max2) / max1 < 0.03) {
      patterns.push('Double top (bearish)');
    }
    
    // Higher lows (uptrend)
    let higherLows = true;
    for (let i = 1; i < 5; i++) {
      if (recentPrices[i * 2] <= recentPrices[(i - 1) * 2]) {
        higherLows = false;
        break;
      }
    }
    if (higherLows) {
      patterns.push('Higher lows (bullish)');
    }
    
    // Lower highs (downtrend)
    let lowerHighs = true;
    for (let i = 1; i < 5; i++) {
      if (recentPrices[i * 2] >= recentPrices[(i - 1) * 2]) {
        lowerHighs = false;
        break;
      }
    }
    if (lowerHighs) {
      patterns.push('Lower highs (bearish)');
    }
    
    return patterns;
  }

  /**
   * Calculate momentum oscillator
   */
  private calculateMomentum(prices: number[], period: number = 10): number {
    if (prices.length < period) return 0;
    
    const currentPrice = prices[prices.length - 1];
    const oldPrice = prices[prices.length - period];
    
    return ((currentPrice - oldPrice) / oldPrice) * 100;
  }

  /**
   * Calculate price volatility (standard deviation of returns)
   */
  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1] * 100);
    }
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const squaredDiffs = returns.map(r => Math.pow(r - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / returns.length;
    
    return Math.sqrt(variance);
  }
}
