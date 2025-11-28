import { Injectable } from '@nestjs/common';

interface AssetData {
  symbol: string;
  returns: number[];
  currentWeight: number;
  targetWeight?: number;
}

export interface PortfolioOptimizationResult {
  weights: Record<string, number>;
  expectedReturn: number;
  risk: number;
  sharpeRatio: number;
}

interface RebalanceAction {
  symbol: string;
  currentWeight: number;
  targetWeight: number;
  action: 'BUY' | 'SELL' | 'HOLD';
  amount: number; // percentage points to adjust
}

@Injectable()
export class PortfolioOptimizationService {
  private readonly MAX_WEIGHT = 0.15; // 15% max per asset
  private readonly REBALANCE_THRESHOLD = 0.10; // 10% deviation threshold

  /**
   * Mean-Variance Optimization (Markowitz)
   * Maximizes Sharpe Ratio with constraints
   */
  optimizePortfolio(
    assets: AssetData[],
    riskFreeRate: number = 0.02
  ): PortfolioOptimizationResult {
    const n = assets.length;
    
    // Calculate expected returns (mean of historical returns)
    const expectedReturns = assets.map(asset => 
      this.calculateMean(asset.returns)
    );

    // Calculate covariance matrix
    const covarianceMatrix = this.calculateCovarianceMatrix(
      assets.map(a => a.returns)
    );

    // Find optimal weights using quadratic optimization
    const weights = this.findOptimalWeights(
      expectedReturns,
      covarianceMatrix,
      n,
      riskFreeRate
    );

    // Calculate portfolio metrics
    const portfolioReturn = this.calculatePortfolioReturn(weights, expectedReturns);
    const portfolioRisk = this.calculatePortfolioRisk(weights, covarianceMatrix);
    const sharpeRatio = (portfolioReturn - riskFreeRate) / portfolioRisk;

    const result: Record<string, number> = {};
    assets.forEach((asset, i) => {
      result[asset.symbol] = weights[i];
    });

    return {
      weights: result,
      expectedReturn: portfolioReturn,
      risk: portfolioRisk,
      sharpeRatio
    };
  }

  /**
   * Dynamic Rebalancing Algorithm
   * Returns BUY/SELL/HOLD decisions based on deviation threshold
   */
  calculateRebalancing(
    currentPortfolio: AssetData[],
    targetWeights: Record<string, number>
  ): RebalanceAction[] {
    const actions: RebalanceAction[] = [];

    for (const asset of currentPortfolio) {
      const currentWeight = asset.currentWeight;
      const targetWeight = targetWeights[asset.symbol] || 0;
      
      // Calculate absolute deviation
      const deviation = Math.abs(currentWeight - targetWeight);
      const deviationPercentage = targetWeight > 0 
        ? deviation / targetWeight 
        : 0;

      let action: 'BUY' | 'SELL' | 'HOLD';
      let amount = 0;

      // Check if deviation exceeds threshold
      if (deviationPercentage > this.REBALANCE_THRESHOLD) {
        if (currentWeight < targetWeight) {
          action = 'BUY';
          amount = targetWeight - currentWeight;
        } else {
          action = 'SELL';
          amount = currentWeight - targetWeight;
        }
      } else {
        action = 'HOLD';
      }

      actions.push({
        symbol: asset.symbol,
        currentWeight,
        targetWeight,
        action,
        amount: Math.abs(amount)
      });
    }

    return actions;
  }

  /**
   * Find optimal weights using gradient descent with constraints
   */
  private findOptimalWeights(
    expectedReturns: number[],
    covMatrix: number[][],
    n: number,
    riskFreeRate: number
  ): number[] {
    // Initialize with equal weights respecting max constraint
    let weights = new Array(n).fill(1 / n);
    
    // Apply max weight constraint
    weights = this.applyMaxWeightConstraint(weights);

    const learningRate = 0.01;
    const iterations = 1000;
    const tolerance = 1e-6;

    for (let iter = 0; iter < iterations; iter++) {
      const oldWeights = [...weights];

      // Calculate gradient of negative Sharpe ratio
      const gradient = this.calculateSharpeGradient(
        weights,
        expectedReturns,
        covMatrix,
        riskFreeRate
      );

      // Update weights
      for (let i = 0; i < n; i++) {
        weights[i] = weights[i] - learningRate * gradient[i];
      }

      // Apply constraints
      weights = this.applyConstraints(weights);

      // Check convergence
      const change = weights.reduce((sum, w, i) => 
        sum + Math.abs(w - oldWeights[i]), 0
      );
      
      if (change < tolerance) break;
    }

    return weights;
  }

  /**
   * Calculate gradient of Sharpe ratio for optimization
   */
  private calculateSharpeGradient(
    weights: number[],
    expectedReturns: number[],
    covMatrix: number[][],
    riskFreeRate: number
  ): number[] {
    const n = weights.length;
    const gradient = new Array(n).fill(0);

    const portfolioReturn = this.calculatePortfolioReturn(weights, expectedReturns);
    const portfolioVariance = this.calculatePortfolioVariance(weights, covMatrix);
    const portfolioStd = Math.sqrt(portfolioVariance);

    const excessReturn = portfolioReturn - riskFreeRate;
    const sharpe = excessReturn / portfolioStd;

    for (let i = 0; i < n; i++) {
      // Gradient of portfolio return
      const dReturn = expectedReturns[i];

      // Gradient of portfolio std dev
      let dVariance = 0;
      for (let j = 0; j < n; j++) {
        dVariance += 2 * covMatrix[i][j] * weights[j];
      }
      const dStd = dVariance / (2 * portfolioStd);

      // Gradient of Sharpe ratio (using quotient rule)
      gradient[i] = -(dReturn * portfolioStd - excessReturn * dStd) / 
                    (portfolioStd * portfolioStd);
    }

    return gradient;
  }

  /**
   * Apply all constraints: sum to 1, non-negative, max weight
   */
  private applyConstraints(weights: number[]): number[] {
    const n = weights.length;
    
    // Make non-negative
    weights = weights.map(w => Math.max(0, w));

    // Apply max weight constraint
    weights = this.applyMaxWeightConstraint(weights);

    // Normalize to sum to 1
    const sum = weights.reduce((a, b) => a + b, 0);
    if (sum > 0) {
      weights = weights.map(w => w / sum);
    } else {
      // If all weights are 0, reset to equal weights
      weights = new Array(n).fill(1 / n);
      weights = this.applyMaxWeightConstraint(weights);
    }

    return weights;
  }

  /**
   * Apply maximum weight constraint (15%)
   */
  private applyMaxWeightConstraint(weights: number[]): number[] {
    let constraintViolated = true;
    
    while (constraintViolated) {
      constraintViolated = false;
      let excessWeight = 0;
      let numUnconstrained = 0;

      // Find violations and excess weight
      for (let i = 0; i < weights.length; i++) {
        if (weights[i] > this.MAX_WEIGHT) {
          excessWeight += weights[i] - this.MAX_WEIGHT;
          weights[i] = this.MAX_WEIGHT;
          constraintViolated = true;
        } else {
          numUnconstrained++;
        }
      }

      // Redistribute excess weight to unconstrained assets
      if (constraintViolated && numUnconstrained > 0) {
        const redistribution = excessWeight / numUnconstrained;
        for (let i = 0; i < weights.length; i++) {
          if (weights[i] < this.MAX_WEIGHT) {
            weights[i] += redistribution;
          }
        }
      }
    }

    return weights;
  }

  /**
   * Calculate covariance matrix from return series
   */
  private calculateCovarianceMatrix(returnSeries: number[][]): number[][] {
    const n = returnSeries.length;
    const means = returnSeries.map(series => this.calculateMean(series));
    const covMatrix: number[][] = [];

    for (let i = 0; i < n; i++) {
      covMatrix[i] = [];
      for (let j = 0; j < n; j++) {
        covMatrix[i][j] = this.calculateCovariance(
          returnSeries[i],
          returnSeries[j],
          means[i],
          means[j]
        );
      }
    }

    return covMatrix;
  }

  /**
   * Calculate covariance between two return series
   */
  private calculateCovariance(
    x: number[],
    y: number[],
    meanX: number,
    meanY: number
  ): number {
    const n = x.length;
    let sum = 0;

    for (let i = 0; i < n; i++) {
      sum += (x[i] - meanX) * (y[i] - meanY);
    }

    return sum / (n - 1);
  }

  /**
   * Calculate mean of a series
   */
  private calculateMean(series: number[]): number {
    return series.reduce((a, b) => a + b, 0) / series.length;
  }

  /**
   * Calculate portfolio expected return
   */
  private calculatePortfolioReturn(
    weights: number[],
    expectedReturns: number[]
  ): number {
    return weights.reduce((sum, w, i) => sum + w * expectedReturns[i], 0);
  }

  /**
   * Calculate portfolio variance
   */
  private calculatePortfolioVariance(
    weights: number[],
    covMatrix: number[][]
  ): number {
    let variance = 0;
    const n = weights.length;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        variance += weights[i] * weights[j] * covMatrix[i][j];
      }
    }

    return variance;
  }

  /**
   * Calculate portfolio risk (standard deviation)
   */
  private calculatePortfolioRisk(
    weights: number[],
    covMatrix: number[][]
  ): number {
    return Math.sqrt(this.calculatePortfolioVariance(weights, covMatrix));
  }
}
