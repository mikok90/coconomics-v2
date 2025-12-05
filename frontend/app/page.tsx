'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './auth-context';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Position {
  id: number;
  asset: { symbol: string; name: string };
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  currentWeight: number;
  targetWeight: number;
}

interface Portfolio {
  id: number;
  cashBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalValue: number;
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  symbol?: string;
  quantity?: number;
  price?: number;
  cashBalanceAfter: number;
  notes?: string;
  createdAt: string;
}

interface RuleOf40 {
  revenueGrowth: number;
  profitMargin: number;
  ruleOf40Score: number;
  rating: string;
  description: string;
}

interface RebalanceAction {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  currentWeight: number;
  targetWeight: number;
  dollarAmount: number;
  shares: number;
  currentPrice: number;
}

interface MiniChart {
  [symbol: string]: { prices: number[]; timestamps: number[] };
}

interface HoverData {
  [symbol: string]: { x: number; price: number; date: string } | null;
}

type Timeframe = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y';

export default function PortfolioPage() {
  const { isAuthenticated, isLoading: authLoading, logout, token } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Helper to get axios config with Authorization header
  const getAuthHeaders = () => ({
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const [portfolioId] = useState(1);
  const [positions, setPositions] = useState<Position[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rebalanceActions, setRebalanceActions] = useState<RebalanceAction[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [sellQuantity, setSellQuantity] = useState('');
  const [cashModalType, setCashModalType] = useState<'deposit' | 'withdraw'>('deposit');
  const [optimization, setOptimization] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<Record<string, any>>({});
  const [miniCharts, setMiniCharts] = useState<MiniChart>({});
  const [selectedTimeframes, setSelectedTimeframes] = useState<Record<string, Timeframe>>({});
  const [hoverData, setHoverData] = useState<HoverData>({});
  const [rebalancingAlgos, setRebalancingAlgos] = useState<Record<string, any>>({});
  const [ruleOf40Data, setRuleOf40Data] = useState<Record<string, RuleOf40>>({});

  // Custom modal state
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ show: false, title: '', message: '', onConfirm: () => {} });

  const [alertModal, setAlertModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, title: '', message: '', type: 'info' });

  // Form state
  const [newPosition, setNewPosition] = useState({
    symbol: '',
    quantity: '',
    avgBuyPrice: ''
  });

  const [cashAmount, setCashAmount] = useState('');

  // Helper functions for custom modals
  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ show: true, title, message, onConfirm });
  };

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlertModal({ show: true, title, message, type });
  };

  useEffect(() => {
    // Only load portfolio data after authentication is confirmed
    if (!authLoading && isAuthenticated && token) {
      loadPortfolio();
      const interval = setInterval(() => {
        updateLivePrices();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [authLoading, isAuthenticated, token]);

  useEffect(() => {
    if (positions.length > 0) {
      loadRecommendations();
      loadAllMiniCharts();
    }
  }, [positions]);

  const loadPortfolio = async () => {
    try {
      // Load portfolio data (includes cash balance)
      const portfolioResponse = await axios.get(`${API_URL}/portfolio/me`, getAuthHeaders());
      setPortfolio(portfolioResponse.data);

      // Load positions
      const positionsResponse = await axios.get(`${API_URL}/portfolio/me/positions`, getAuthHeaders());
      setPositions(positionsResponse.data);

      // Calculate total value from all positions
      const total = positionsResponse.data.reduce((sum: number, pos: Position) => {
        return sum + (pos.quantity * pos.currentPrice);
      }, 0);
      setTotalValue(total);
    } catch (error) {
      console.error('Error loading portfolio:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await axios.get(`${API_URL}/portfolio/me/transactions`, getAuthHeaders());
      setTransactions(response.data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const depositCash = async () => {
    const amount = parseFloat(cashAmount);
    if (!amount || amount <= 0) {
      showAlert('Invalid Amount', 'Please enter a valid amount', 'error');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/portfolio/me/deposit`, { amount }, getAuthHeaders());
      setCashAmount('');
      setShowCashModal(false);
      await loadPortfolio();
      await loadTransactions();
    } catch (error: any) {
      console.error('Error depositing cash:', error);
      showAlert('Error', error.response?.data?.message || 'Error depositing cash', 'error');
    } finally {
      setLoading(false);
    }
  };

  const withdrawCash = async () => {
    const amount = parseFloat(cashAmount);
    if (!amount || amount <= 0) {
      showAlert('Invalid Amount', 'Please enter a valid amount', 'error');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/portfolio/me/withdraw`, { amount }, getAuthHeaders());
      setCashAmount('');
      setShowCashModal(false);
      await loadPortfolio();
      await loadTransactions();
    } catch (error: any) {
      console.error('Error withdrawing cash:', error);
      showAlert('Error', error.response?.data?.message || 'Error withdrawing cash', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateLivePrices = async () => {
    try {
      const response = await axios.get(`${API_URL}/portfolio/me/live-prices`, getAuthHeaders());
      setPositions(response.data);
      
      // Calculate total value from all positions
      const total = response.data.reduce((sum: number, pos: Position) => {
        return sum + (pos.quantity * pos.currentPrice);
      }, 0);
      setTotalValue(total);
    } catch (error) {
      console.error('Error updating live prices:', error);
    }
  };

  const loadRecommendations = async () => {
    const recs: Record<string, any> = {};
    const algos: Record<string, any> = {};
    const ruleOf40: Record<string, RuleOf40> = {};

    for (const position of positions) {
      try {
        // Load rebalancing algorithms
        const rebalancingResponse = await axios.get(`${API_URL}/portfolio/position/${position.id}/rebalancing`, getAuthHeaders());
        algos[position.asset.symbol] = rebalancingResponse.data;
      } catch (error) {
        console.error(`Error loading algorithms for ${position.asset.symbol}`);
      }

      try {
        // Load Rule of 40 data
        const ruleOf40Response = await axios.get(`${API_URL}/portfolio/stock/${position.asset.symbol}/rule-of-40`, getAuthHeaders());
        ruleOf40[position.asset.symbol] = ruleOf40Response.data;
      } catch (error) {
        console.error(`Error loading Rule of 40 for ${position.asset.symbol}`);
      }
    }

    setRebalancingAlgos(algos);
    setRuleOf40Data(ruleOf40);
  };

  const loadAllMiniCharts = async () => {
    const charts: MiniChart = {};
    for (const position of positions) {
      try {
        const timeframe = selectedTimeframes[position.asset.symbol] || '1d';
        const response = await axios.get(`${API_URL}/portfolio/stock/${position.asset.symbol}/chart`, {
          params: { range: timeframe },
          ...getAuthHeaders()
        });
        charts[position.asset.symbol] = {
          prices: response.data.prices.filter((p: number) => p !== null),
          timestamps: response.data.timestamp || []
        };
      } catch (error) {
        console.error(`Error loading chart for ${position.asset.symbol}`);
      }
    }
    setMiniCharts(charts);
  };

  const changeTimeframe = async (symbol: string, timeframe: Timeframe) => {
    setSelectedTimeframes(prev => ({ ...prev, [symbol]: timeframe }));
    try {
      const response = await axios.get(`${API_URL}/portfolio/stock/${symbol}/chart`, {
        params: { range: timeframe },
        ...getAuthHeaders()
      });
      setMiniCharts(prev => ({
        ...prev,
        [symbol]: {
          prices: response.data.prices.filter((p: number) => p !== null),
          timestamps: response.data.timestamp || []
        }
      }));
    } catch (error) {
      console.error(`Error loading chart for ${symbol}`);
    }
  };

  const addPosition = async () => {
    if (!newPosition.symbol || !newPosition.quantity || !newPosition.avgBuyPrice) {
      showAlert('Missing Information', 'Please fill all fields', 'error');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/portfolio/me/add-position`, {
        symbol: newPosition.symbol.toUpperCase(),
        quantity: parseFloat(newPosition.quantity),
        avgBuyPrice: parseFloat(newPosition.avgBuyPrice)
      }, getAuthHeaders());

      setNewPosition({ symbol: '', quantity: '', avgBuyPrice: '' });
      setShowAddPosition(false);
      await loadPortfolio();
    } catch (error: any) {
      console.error('Error adding position:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error adding position';
      showAlert('Error', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const sellShares = async () => {
    if (!selectedPosition || !sellQuantity || parseFloat(sellQuantity) <= 0) {
      showAlert('Invalid Quantity', 'Please enter a valid quantity', 'error');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/portfolio/position/${selectedPosition.id}/sell`, {
        quantity: parseFloat(sellQuantity)
      }, getAuthHeaders());

      setSellQuantity('');
      setShowSellModal(false);
      setSelectedPosition(null);
      await loadPortfolio();
      await loadTransactions();
    } catch (error: any) {
      console.error('Error selling shares:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error selling shares';
      showAlert('Error', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const deletePosition = (positionId: number) => {
    showConfirm(
      'Remove Position',
      'Remove this position from portfolio?',
      async () => {
        try {
          await axios.delete(`${API_URL}/portfolio/position/${positionId}`, getAuthHeaders());
          await loadPortfolio();
        } catch (error) {
          console.error('Error deleting position:', error);
          showAlert('Error', 'Error removing position', 'error');
        }
      }
    );
  };

  const deleteAllTransactions = () => {
    showConfirm(
      'Delete All History',
      'Are you sure you want to delete all transaction history? This action cannot be undone.',
      async () => {
        try {
          await axios.delete(`${API_URL}/portfolio/me/transactions`, getAuthHeaders());
          await loadTransactions();
        } catch (error) {
          console.error('Error deleting transactions:', error);
          showAlert('Error', 'Error deleting transaction history', 'error');
        }
      }
    );
  };

  const runOptimization = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/portfolio/me/optimize`, {
        riskFreeRate: 0.02
      }, getAuthHeaders());

      setOptimization(response.data.optimization);
      setPositions(response.data.positions);
      showAlert('Success', 'Optimization complete!', 'success');
    } catch (error) {
      console.error('Error optimizing:', error);
      showAlert('Error', 'Error running optimization', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateRebalancing = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/portfolio/me/rebalance`, {}, getAuthHeaders());
      setRebalanceActions(response.data);
    } catch (error: any) {
      console.error('Error calculating rebalancing:', error);
      showAlert('Error', error.response?.data?.message || 'Error calculating rebalancing', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const calculateTotalProfitLoss = () => {
    return positions.reduce((total, position) => {
      const currentValue = position.quantity * position.currentPrice;
      const costBasis = position.quantity * position.avgBuyPrice;
      return total + (currentValue - costBasis);
    }, 0);
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24 overflow-x-hidden max-w-full">
      {/* Header with Logout Button */}
      <div className="px-6 pt-6 pb-2 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-white">Coconomics</h1>
        </div>
        <button
          onClick={logout}
          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-xl text-sm font-medium transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Total Value Card */}
      <div className="px-6 pt-6 pb-6">
        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl p-8 shadow-2xl">
          <p className="text-cyan-100 text-sm mb-2 opacity-90">Portfolio Value</p>
          <h2 className="text-5xl font-bold tracking-tight">
            {formatCurrency((totalValue || 0) + (portfolio?.cashBalance ? parseFloat(portfolio.cashBalance.toString()) : 0))}
          </h2>

          <div className="mt-6 pt-6 border-t border-white/20 space-y-3">
            {/* Cash Balance */}
            <div className="flex justify-between items-center">
              <span className="text-cyan-100 text-sm opacity-90">Cash Balance</span>
              <span className="text-2xl font-bold text-white">
                {formatCurrency(portfolio?.cashBalance ? parseFloat(portfolio.cashBalance.toString()) : 0)}
              </span>
            </div>

            {/* Stocks Value */}
            <div className="flex justify-between items-center">
              <span className="text-cyan-100 text-sm opacity-90">Stocks Value</span>
              <span className="text-xl font-semibold text-white/90">
                {formatCurrency(totalValue)}
              </span>
            </div>

            {/* Total Profit/Loss */}
            {positions.length > 0 && (
              <div className="flex justify-between items-center pt-3 border-t border-white/10">
                <span className="text-cyan-100 text-sm opacity-90">Total Profit/Loss</span>
                <span className={`text-2xl font-bold ${
                  calculateTotalProfitLoss() >= 0 ? 'text-green-300' : 'text-red-300'
                }`}>
                  {calculateTotalProfitLoss() >= 0 ? '+' : ''}{formatCurrency(calculateTotalProfitLoss())}
                </span>
              </div>
            )}
          </div>

          {/* Cash Management Buttons */}
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => { setCashModalType('deposit'); setShowCashModal(true); }}
              className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl py-3 font-semibold transition-all"
            >
              + Deposit
            </button>
            <button
              onClick={() => { setCashModalType('withdraw'); setShowCashModal(true); }}
              className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl py-3 font-semibold transition-all"
            >
              − Withdraw
            </button>
            <button
              onClick={() => { loadTransactions(); setShowTransactions(true); }}
              className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl py-3 font-semibold transition-all"
            >
              History
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-6 pb-6">
        <button
          onClick={() => setShowAddPosition(true)}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-2xl p-4 font-semibold shadow-lg transition-all duration-200"
        >
          + Add Stock
        </button>
      </div>

      {/* Positions List */}
      <div className="px-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-400">Holdings</h3>
          {positions.length > 0 && Object.keys(recommendations).length > 0 && (
            <div className="flex gap-2 text-xs">
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full border border-green-500/30 font-semibold">
                {Object.values(recommendations).filter((r: any) => r.signal === 'BUY').length} BUY
              </span>
              <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full border border-red-500/30 font-semibold">
                {Object.values(recommendations).filter((r: any) => r.signal === 'SELL').length} SELL
              </span>
              <span className="px-3 py-1 bg-gray-500/20 text-gray-400 rounded-full border border-gray-500/30 font-semibold">
                {Object.values(recommendations).filter((r: any) => r.signal === 'HOLD').length} HOLD
              </span>
            </div>
          )}
        </div>
        {positions.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 text-center border border-white/10">
            <p className="text-gray-500">No positions yet</p>
            <p className="text-gray-600 text-sm mt-1">Add your first stock to start</p>
          </div>
        ) : (
          <div className="space-y-3">
            {positions.map((position) => {
              const currentValue = position.quantity * position.currentPrice;
              const costBasis = position.quantity * position.avgBuyPrice;
              const profitLoss = currentValue - costBasis;
              const profitLossPercent = (profitLoss / costBasis) * 100;
              const recommendation = recommendations[position.asset.symbol];
              const chartData = miniCharts[position.asset.symbol];
              const chartPrices = chartData?.prices || [];
              const chartTimestamps = chartData?.timestamps || [];
              
              return (
                <div 
                  key={position.id} 
                  className="bg-zinc-900 rounded-xl p-4 border border-zinc-800"
                >
                  {/* Top: Symbol, Badge, Sell/Remove buttons */}
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold">{position.asset.symbol}</h3>
                      {recommendation && (
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          recommendation.signal === 'BUY' ? 'bg-green-600 text-white' :
                          recommendation.signal === 'SELL' ? 'bg-red-600 text-white' :
                          'bg-gray-600 text-white'
                        }`}>
                          {recommendation.signal}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setSelectedPosition(position); setShowSellModal(true); }}
                        className="text-green-400 text-sm hover:text-green-300 font-semibold"
                      >
                        Sell
                      </button>
                      <button
                        onClick={() => deletePosition(position.id)}
                        className="text-red-400 text-sm hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Value and P/L */}
                  <div className="mb-4">
                    {/* Live stock price per share */}
                    <div className="text-sm text-gray-400 mb-1">
                      €{parseFloat(position.currentPrice.toString()).toFixed(2)} per share
                    </div>
                    {/* Total value - smaller */}
                    <div className="text-xl font-bold mb-1">{formatCurrency(currentValue)}</div>
                    <div className={`text-base font-semibold ${profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {profitLoss >= 0 ? '+' : ''}{formatCurrency(profitLoss)} ({profitLoss >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}%)
                    </div>
                  </div>

                  {/* Timeframe Buttons - Centered, spacious */}
                  <div className="flex justify-center gap-3 mb-4">
                    {(['1d', '5d', '1mo', '3mo', '6mo', '1y', '5y'] as Timeframe[]).map((tf) => {
                      const labels: Record<Timeframe, string> = {
                        '1d': '1D',
                        '5d': '5D', 
                        '1mo': '1M',
                        '3mo': '3M',
                        '6mo': '6M',
                        '1y': '1Y',
                        '5y': '5Y'
                      };
                      return (
                        <button
                          key={tf}
                          onClick={() => changeTimeframe(position.asset.symbol, tf)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                            (selectedTimeframes[position.asset.symbol] || '1d') === tf
                              ? 'bg-cyan-500 text-white'
                              : 'bg-transparent text-gray-400 hover:text-gray-200'
                          }`}
                        >
                          {labels[tf]}
                        </button>
                      );
                    })}
                  </div>

                  {/* Large Revolut-style Chart with Grid & Hover */}
                  {chartPrices.length > 0 && (
                    <div className="relative mb-4">
                      {/* Chart container */}
                      <div 
                        className="h-48 rounded-xl overflow-hidden bg-black relative cursor-crosshair"
                        onMouseMove={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const width = rect.width;
                          const index = Math.floor((x / width) * chartPrices.length);
                          if (index >= 0 && index < chartPrices.length && chartTimestamps[index]) {
                            const date = new Date(chartTimestamps[index] * 1000); // Convert Unix timestamp to Date
                            const tf = selectedTimeframes[position.asset.symbol] || '1d';
                            
                            let dateStr = '';
                            if (tf === '1d' || tf === '5d') {
                              dateStr = date.toLocaleString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              });
                            } else {
                              dateStr = date.toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: tf === '5y' ? 'numeric' : undefined
                              });
                            }
                            
                            setHoverData(prev => ({
                              ...prev,
                              [position.asset.symbol]: {
                                x: (index / (chartPrices.length - 1)) * 100,
                                price: chartPrices[index],
                                date: dateStr
                              }
                            }));
                          }
                        }}
                        onMouseLeave={() => {
                          setHoverData(prev => ({ ...prev, [position.asset.symbol]: null }));
                        }}
                        onTouchMove={(e) => {
                          const touch = e.touches[0];
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = touch.clientX - rect.left;
                          const width = rect.width;
                          const index = Math.floor((x / width) * chartPrices.length);
                          if (index >= 0 && index < chartPrices.length) {
                            const tf = selectedTimeframes[position.asset.symbol] || '1d';
                            let date = new Date();
                            
                            if (tf === '1d') {
                              date.setHours(9, 30 + (index * 6.5 * 60 / chartPrices.length), 0);
                            } else if (tf === '1mo') {
                              date.setDate(date.getDate() - (30 - Math.floor(index * 30 / chartPrices.length)));
                            }
                            
                            setHoverData(prev => ({
                              ...prev,
                              [position.asset.symbol]: {
                                x: (index / (chartPrices.length - 1)) * 100,
                                price: chartPrices[index],
                                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                              }
                            }));
                          }
                        }}
                        onTouchEnd={() => {
                          setHoverData(prev => ({ ...prev, [position.asset.symbol]: null }));
                        }}
                      >
                        <svg viewBox="0 0 400 180" className="w-full h-full" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id={`g${position.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#f87171" stopOpacity="0.15"/>
                              <stop offset="100%" stopColor="#f87171" stopOpacity="0"/>
                            </linearGradient>
                          </defs>
                          
                          {/* Horizontal Grid Lines with CLEAN price labels */}
                          {[0.25, 0.5, 0.75].map((ratio, i) => {
                            const min = Math.min(...chartPrices);
                            const max = Math.max(...chartPrices);
                            const price = min + (max - min) * ratio;
                            const y = 170 - (ratio * 160);
                            
                            return (
                              <g key={i}>
                                <line
                                  x1="0"
                                  y1={y}
                                  x2="380"
                                  y2={y}
                                  stroke="#ffffff"
                                  strokeOpacity="0.03"
                                  strokeWidth="1"
                                />
                                {/* Clean price label */}
                                <text
                                  x="398"
                                  y={y + 4}
                                  fill="#888888"
                                  fontSize="11"
                                  textAnchor="end"
                                  fontFamily="system-ui, -apple-system, sans-serif"
                                  fontWeight="400"
                                  letterSpacing="0.3"
                                >
                                  {Math.round(price)}
                                </text>
                              </g>
                            );
                          })}
                          
                          {/* Gradient fill */}
                          <path
                            d={`M 0 ${(() => {
                              const min = Math.min(...chartPrices);
                              const max = Math.max(...chartPrices);
                              return 170 - ((chartPrices[0] - min) / (max - min || 1)) * 160;
                            })()}
                            ${chartPrices.map((p: number, i: number) => {
                              const x = (i / (chartPrices.length - 1)) * 400;
                              const min = Math.min(...chartPrices);
                              const max = Math.max(...chartPrices);
                              const y = 170 - ((p - min) / (max - min || 1)) * 160;
                              return `L ${x} ${y}`;
                            }).join(' ')}
                            L 400 180 L 0 180 Z`}
                            fill={`url(#g${position.id})`}
                          />
                          
                          {/* Line - Catmull-Rom smooth curve like Revolut */}
                          <path
                            d={(() => {
                              if (chartPrices.length < 2) return '';
                              
                              const min = Math.min(...chartPrices);
                              const max = Math.max(...chartPrices);
                              
                              // Get point coordinates
                              const points = chartPrices.map((p: number, i: number) => ({
                                x: (i / (chartPrices.length - 1)) * 400,
                                y: 170 - ((p - min) / (max - min || 1)) * 160
                              }));
                              
                              if (points.length < 2) return '';
                              
                              // Start at first point
                              let path = `M ${points[0].x} ${points[0].y}`;
                              
                              // Use Catmull-Rom spline for smooth natural curves
                              for (let i = 0; i < points.length - 1; i++) {
                                const p0 = points[Math.max(i - 1, 0)];
                                const p1 = points[i];
                                const p2 = points[i + 1];
                                const p3 = points[Math.min(i + 2, points.length - 1)];
                                
                                // Control points for cubic bezier
                                const cp1x = p1.x + (p2.x - p0.x) / 6;
                                const cp1y = p1.y + (p2.y - p0.y) / 6;
                                const cp2x = p2.x - (p3.x - p1.x) / 6;
                                const cp2y = p2.y - (p3.y - p1.y) / 6;
                                
                                path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
                              }
                              
                              return path;
                            })()}
                            fill="none"
                            stroke="#f87171"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          
                          {/* Hover Crosshair */}
                          {hoverData[position.asset.symbol] && (
                            <>
                              <line
                                x1={hoverData[position.asset.symbol].x * 4}
                                y1="0"
                                x2={hoverData[position.asset.symbol].x * 4}
                                y2="180"
                                stroke="#ffffff"
                                strokeWidth="1"
                                strokeOpacity="0.5"
                                strokeDasharray="4,4"
                              />
                              <circle
                                cx={hoverData[position.asset.symbol].x * 4}
                                cy={(() => {
                                  const min = Math.min(...chartPrices);
                                  const max = Math.max(...chartPrices);
                                  return 170 - ((hoverData[position.asset.symbol]!.price - min) / (max - min || 1)) * 160;
                                })()}
                                r="4"
                                fill="#f87171"
                                stroke="#ffffff"
                                strokeWidth="2"
                              />
                            </>
                          )}
                        </svg>
                        
                        {/* Hover Tooltip */}
                        {hoverData[position.asset.symbol] && (
                          <div 
                            className="absolute top-2 bg-black/90 border border-white/20 rounded-lg px-3 py-2 pointer-events-none"
                            style={{ 
                              left: `${Math.min(Math.max(hoverData[position.asset.symbol].x, 10), 90)}%`,
                              transform: 'translateX(-50%)'
                            }}
                          >
                            <div className="text-xs text-gray-400">{hoverData[position.asset.symbol].date}</div>
                            <div className="text-sm font-bold text-white">
                              {formatCurrency(hoverData[position.asset.symbol].price)}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Time labels - Real dates from timestamps */}
                      <div className="flex justify-between text-xs text-gray-600 mt-2 px-2">
                        {chartTimestamps.length > 0 ? (
                          (() => {
                            const tf = selectedTimeframes[position.asset.symbol] || '1d';
                            const indices = [
                              0,
                              Math.floor(chartTimestamps.length / 2),
                              chartTimestamps.length - 1
                            ];
                            
                            return indices.map((idx, i) => {
                              if (!chartTimestamps[idx]) return <span key={i}>-</span>;
                              const date = new Date(chartTimestamps[idx] * 1000);
                              
                              if (tf === '1d' || tf === '5d') {
                                return (
                                  <span key={i}>
                                    {date.toLocaleTimeString('en-US', { 
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: false
                                    })}
                                  </span>
                                );
                              } else if (tf === '1mo' || tf === '3mo') {
                                return (
                                  <span key={i}>
                                    {date.toLocaleDateString('en-US', { 
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </span>
                                );
                              } else if (tf === '6mo' || tf === '1y') {
                                return (
                                  <span key={i}>
                                    {date.toLocaleDateString('en-US', { month: 'short' })}
                                  </span>
                                );
                              } else {
                                return (
                                  <span key={i}>
                                    {date.toLocaleDateString('en-US', { 
                                      year: 'numeric',
                                      month: 'short'
                                    })}
                                  </span>
                                );
                              }
                            });
                          })()
                        ) : (
                          <>
                            <span>-</span>
                            <span>-</span>
                            <span>-</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bottom: Stats */}
                  <div className="flex justify-between text-xs text-gray-400 mb-3">
                    <span>{position.quantity} shares</span>
                    <span>Avg {formatCurrency(position.avgBuyPrice)}</span>
                    <span>Now {formatCurrency(position.currentPrice)}</span>
                  </div>

                  {/* RULE OF 40 */}
                  {ruleOf40Data[position.asset.symbol] && (
                    <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700 mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-xs font-semibold text-white">Rule of 40</h4>
                        <div className="group relative">
                          <span className="text-gray-500 hover:text-gray-300 text-xs cursor-help">ⓘ</span>
                          <div className="invisible group-hover:visible absolute left-0 top-6 z-50 w-64 bg-black border border-white/20 rounded-lg p-2 text-[10px] text-gray-300 shadow-xl">
                            A metric for SaaS/software companies. Revenue Growth % + Profit Margin % should be ≥ 40%. Higher is better.
                          </div>
                        </div>
                        <span className={`ml-auto px-2 py-0.5 rounded text-xs font-bold ${
                          ruleOf40Data[position.asset.symbol].rating === 'Excellent' ? 'bg-green-600 text-white' :
                          ruleOf40Data[position.asset.symbol].rating === 'Good' ? 'bg-blue-600 text-white' :
                          ruleOf40Data[position.asset.symbol].rating === 'Fair' ? 'bg-yellow-600 text-white' :
                          'bg-red-600 text-white'
                        }`}>
                          {ruleOf40Data[position.asset.symbol].rating || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Score</span>
                        <span className="font-bold text-white">{(ruleOf40Data[position.asset.symbol].ruleOf40Score || 0).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Revenue Growth</span>
                        <span className="text-white">{(ruleOf40Data[position.asset.symbol].revenueGrowth || 0).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Profit Margin</span>
                        <span className="text-white">{(ruleOf40Data[position.asset.symbol].profitMargin || 0).toFixed(1)}%</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2">{ruleOf40Data[position.asset.symbol].description || 'No data available'}</p>
                    </div>
                  )}

                  {/* REBALANCING ALGORITHMS */}
                  {rebalancingAlgos[position.asset.symbol] && (
                    <div className="space-y-2 pt-3 border-t border-zinc-800">
                      {/* Value Averaging Algorithm */}
                      <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-xs font-semibold text-white">Value Averaging</h4>
                          <div 
                            className="group relative"
                          >
                            <span className="text-gray-500 hover:text-gray-300 text-xs cursor-help">ⓘ</span>
                            <div className="invisible group-hover:visible absolute left-0 top-6 z-50 w-64 bg-black border border-white/20 rounded-lg p-2 text-[10px] text-gray-300 shadow-xl">
                              Rebalances to maintain target portfolio value with steady growth. Automatically buys when below target, sells when above.
                            </div>
                          </div>
                        </div>
                        {(() => {
                          const va = rebalancingAlgos[position.asset.symbol].valueAveraging;
                          return (
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                  va.action === 'BUY' ? 'bg-green-600 text-white' :
                                  va.action === 'SELL' ? 'bg-red-600 text-white' :
                                  'bg-gray-600 text-white'
                                }`}>
                                  {va.action}
                                </span>
                                <span className="text-xs font-semibold text-white">
                                  {va.shares > 0 ? `${va.shares} shares (${va.amount})` : 'Hold'}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-400">{va.reason}</p>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Threshold Rebalancing Algorithm */}
                      <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-xs font-semibold text-white">Threshold Rebalancing</h4>
                          <div 
                            className="group relative"
                          >
                            <span className="text-gray-500 hover:text-gray-300 text-xs cursor-help">ⓘ</span>
                            <div className="invisible group-hover:visible absolute left-0 top-6 z-50 w-64 bg-black border border-white/20 rounded-lg p-2 text-[10px] text-gray-300 shadow-xl">
                              Buys when price drops 10-20% (averaging down), sells when price rises 10-20% (taking profits). Based on deviation from your average buy price.
                            </div>
                          </div>
                        </div>
                        {(() => {
                          const tr = rebalancingAlgos[position.asset.symbol].thresholdRebalancing;
                          return (
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                  tr.action === 'BUY' ? 'bg-green-600 text-white' :
                                  tr.action === 'SELL' ? 'bg-red-600 text-white' :
                                  'bg-gray-600 text-white'
                                }`}>
                                  {tr.action} {tr.percentage}
                                </span>
                                <span className="text-xs font-semibold text-white">
                                  {tr.shares > 0 ? `${tr.shares} shares (${tr.amount})` : 'Hold'}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-400">{tr.reason}</p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Position Modal */}
      {showAddPosition && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-end justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-zinc-900 rounded-t-3xl w-full max-w-md border-t border-white/10 animate-in slide-in-from-bottom duration-300">
            <div className="p-6">
              {/* Handle bar */}
              <div className="w-12 h-1 bg-gray-700 rounded-full mx-auto mb-6"></div>

              <h3 className="text-2xl font-semibold mb-6">Add Position</h3>

              {/* Show cash balance warning */}
              <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                <p className="text-xs text-blue-300">
                  Available Cash: {formatCurrency(portfolio?.cashBalance || 0)}
                </p>
                {newPosition.quantity && newPosition.avgBuyPrice && (
                  <p className="text-xs text-blue-300 mt-1">
                    This purchase will cost: {formatCurrency(parseFloat(newPosition.quantity) * parseFloat(newPosition.avgBuyPrice))}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-gray-500 text-xs font-medium mb-2 block">SYMBOL</label>
                  <input
                    type="text"
                    placeholder="AAPL"
                    value={newPosition.symbol}
                    onChange={(e) => setNewPosition({ ...newPosition, symbol: e.target.value.toUpperCase() })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-gray-500 text-xs font-medium mb-2 block">QUANTITY</label>
                  <input
                    type="number"
                    placeholder="10"
                    value={newPosition.quantity}
                    onChange={(e) => setNewPosition({ ...newPosition, quantity: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-gray-500 text-xs font-medium mb-2 block">AVERAGE PRICE</label>
                  <input
                    type="number"
                    placeholder="150.00"
                    value={newPosition.avgBuyPrice}
                    onChange={(e) => setNewPosition({ ...newPosition, avgBuyPrice: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8 pb-2">
                <button
                  onClick={() => setShowAddPosition(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl py-4 font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={addPosition}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-2xl py-4 font-semibold transition-all disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Position'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cash Deposit/Withdraw Modal */}
      {showCashModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-end justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-zinc-900 rounded-t-3xl w-full max-w-md border-t border-white/10 animate-in slide-in-from-bottom duration-300">
            <div className="p-6">
              <div className="w-12 h-1 bg-gray-700 rounded-full mx-auto mb-6"></div>

              <h3 className="text-2xl font-semibold mb-2">
                {cashModalType === 'deposit' ? 'Deposit Cash' : 'Withdraw Cash'}
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                Current balance: {formatCurrency(portfolio?.cashBalance || 0)}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-gray-500 text-xs font-medium mb-2 block">AMOUNT ($)</label>
                  <input
                    type="number"
                    placeholder="1000.00"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors text-2xl font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8 pb-2">
                <button
                  onClick={() => { setShowCashModal(false); setCashAmount(''); }}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl py-4 font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={cashModalType === 'deposit' ? depositCash : withdrawCash}
                  disabled={loading}
                  className={`flex-1 rounded-2xl py-4 font-semibold transition-all disabled:opacity-50 ${
                    cashModalType === 'deposit'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                      : 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
                  }`}
                >
                  {loading ? 'Processing...' : (cashModalType === 'deposit' ? 'Deposit' : 'Withdraw')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History Modal */}
      {showTransactions && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-end justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-zinc-900 rounded-t-3xl w-full max-w-md border-t border-white/10 animate-in slide-in-from-bottom duration-300 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 flex-shrink-0">
              <div className="w-12 h-1 bg-gray-700 rounded-full mx-auto mb-6"></div>
              <h3 className="text-2xl font-semibold mb-2">Transaction History</h3>
              <p className="text-gray-400 text-sm">Recent activity</p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No transactions yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            tx.type === 'DEPOSIT' ? 'bg-green-600 text-white' :
                            tx.type === 'WITHDRAWAL' ? 'bg-red-600 text-white' :
                            tx.type === 'BUY' ? 'bg-blue-600 text-white' :
                            'bg-orange-600 text-white'
                          }`}>
                            {tx.type}
                          </span>
                          {tx.symbol && <span className="ml-2 text-sm font-semibold">{tx.symbol}</span>}
                        </div>
                        <span className={`text-lg font-bold ${
                          tx.type === 'DEPOSIT' || tx.type === 'SELL' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {tx.type === 'DEPOSIT' || tx.type === 'SELL' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                      </div>
                      {tx.quantity && tx.price && (
                        <p className="text-xs text-gray-400 mb-1">
                          {tx.quantity} shares @ {formatCurrency(tx.price)}
                        </p>
                      )}
                      {tx.notes && (
                        <p className="text-xs text-gray-400 mb-2">{tx.notes}</p>
                      )}
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{new Date(tx.createdAt).toLocaleString()}</span>
                        <span>Balance: {formatCurrency(tx.cashBalanceAfter)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 flex-shrink-0 border-t border-zinc-800">
              <div className="flex gap-3">
                {transactions.length > 0 && (
                  <button
                    onClick={deleteAllTransactions}
                    className="flex-1 bg-red-600/20 hover:bg-red-600/30 border border-red-600/40 rounded-2xl py-4 font-medium transition-all text-red-400"
                  >
                    Delete History
                  </button>
                )}
                <button
                  onClick={() => setShowTransactions(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl py-4 font-medium transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sell Shares Modal */}
      {showSellModal && selectedPosition && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-end justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-zinc-900 rounded-t-3xl w-full max-w-md border-t border-white/10 animate-in slide-in-from-bottom duration-300">
            <div className="p-6">
              <div className="w-12 h-1 bg-gray-700 rounded-full mx-auto mb-6"></div>

              <h3 className="text-2xl font-semibold mb-2">Sell {selectedPosition.asset.symbol}</h3>
              <p className="text-gray-400 text-sm mb-4">
                You own {selectedPosition.quantity} shares @ ${parseFloat(selectedPosition.currentPrice.toString()).toFixed(2)} each
              </p>

              <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                <p className="text-xs text-green-300">
                  Total Value: {formatCurrency(selectedPosition.quantity * parseFloat(selectedPosition.currentPrice.toString()))}
                </p>
                {sellQuantity && parseFloat(sellQuantity) > 0 && (
                  <p className="text-xs text-green-300 mt-1">
                    Proceeds from sale: {formatCurrency(parseFloat(sellQuantity) * parseFloat(selectedPosition.currentPrice.toString()))}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-gray-500 text-xs font-medium mb-2 block">QUANTITY TO SELL</label>
                  <input
                    type="number"
                    placeholder={`Max: ${selectedPosition.quantity}`}
                    value={sellQuantity}
                    onChange={(e) => setSellQuantity(e.target.value)}
                    max={selectedPosition.quantity}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-green-500 transition-colors text-2xl font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8 pb-2">
                <button
                  onClick={() => { setShowSellModal(false); setSellQuantity(''); setSelectedPosition(null); }}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl py-4 font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={sellShares}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-2xl py-4 font-semibold transition-all disabled:opacity-50"
                >
                  {loading ? 'Selling...' : 'Sell Shares'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200 px-6">
          <div className="bg-zinc-900 rounded-3xl w-full max-w-sm border border-white/10 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-3">{confirmModal.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl py-4 font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal({ ...confirmModal, show: false });
                }}
                className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 rounded-2xl py-4 font-semibold transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {alertModal.show && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200 px-6">
          <div className="bg-zinc-900 rounded-3xl w-full max-w-sm border border-white/10 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                {alertModal.type === 'success' && (
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <span className="text-green-400 text-xl">✓</span>
                  </div>
                )}
                {alertModal.type === 'error' && (
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <span className="text-red-400 text-xl">✕</span>
                  </div>
                )}
                {alertModal.type === 'info' && (
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span className="text-blue-400 text-xl">i</span>
                  </div>
                )}
                <h3 className="text-xl font-semibold">{alertModal.title}</h3>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed ml-13">{alertModal.message}</p>
            </div>
            <div className="p-6 pt-0">
              <button
                onClick={() => setAlertModal({ ...alertModal, show: false })}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-2xl py-4 font-semibold transition-all"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
