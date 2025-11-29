'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

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
  const [portfolioId] = useState(1);
  const [positions, setPositions] = useState<Position[]>([]);
  const [rebalanceActions, setRebalanceActions] = useState<RebalanceAction[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [optimization, setOptimization] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<Record<string, any>>({});
  const [miniCharts, setMiniCharts] = useState<MiniChart>({});
  const [selectedTimeframes, setSelectedTimeframes] = useState<Record<string, Timeframe>>({});
  const [hoverData, setHoverData] = useState<HoverData>({});
  const [rebalancingAlgos, setRebalancingAlgos] = useState<Record<string, any>>({});

  // Form state
  const [newPosition, setNewPosition] = useState({
    symbol: '',
    quantity: '',
    avgBuyPrice: ''
  });

  useEffect(() => {
    loadPortfolio();
    const interval = setInterval(() => {
      updateLivePrices();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (positions.length > 0) {
      loadRecommendations();
      loadAllMiniCharts();
    }
  }, [positions]);

  const loadPortfolio = async () => {
    try {
      // Fetch positions with live prices
      const response = await axios.get(`${API_URL}/portfolio/${portfolioId}/live-prices`);
      setPositions(response.data);

      // Calculate total value from all positions
      const total = response.data.reduce((sum: number, pos: Position) => {
        return sum + (pos.quantity * pos.currentPrice);
      }, 0);
      setTotalValue(total);
    } catch (error) {
      console.error('Error loading portfolio:', error);
    }
  };

  const updateLivePrices = async () => {
    try {
      const response = await axios.get(`${API_URL}/portfolio/${portfolioId}/live-prices`);
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
    
    for (const position of positions) {
      try {
        // Load rebalancing algorithms
        const rebalancingResponse = await axios.get(`${API_URL}/portfolio/position/${position.id}/rebalancing`);
        algos[position.asset.symbol] = rebalancingResponse.data;
      } catch (error) {
        console.error(`Error loading algorithms for ${position.asset.symbol}`);
      }
    }
    
    setRebalancingAlgos(algos);
  };

  const loadAllMiniCharts = async () => {
    const charts: MiniChart = {};
    for (const position of positions) {
      try {
        const timeframe = selectedTimeframes[position.asset.symbol] || '1d';
        console.log(`Fetching chart for ${position.asset.symbol} with range ${timeframe}`);
        const response = await axios.get(`${API_URL}/portfolio/stock/${position.asset.symbol}/chart`, {
          params: { range: timeframe }
        });
        console.log(`Chart response for ${position.asset.symbol}:`, response.data);

        if (response.data && response.data.prices && response.data.prices.length > 0) {
          const validPrices = response.data.prices.filter((p: number) => p !== null && p !== undefined);
          const validTimestamps = response.data.timestamp || [];

          console.log(`Valid data for ${position.asset.symbol}: ${validPrices.length} prices, ${validTimestamps.length} timestamps`);

          charts[position.asset.symbol] = {
            prices: validPrices,
            timestamps: validTimestamps
          };
        } else {
          console.warn(`No chart data available for ${position.asset.symbol}`, response.data);
        }
      } catch (error: any) {
        console.error(`Error loading chart for ${position.asset.symbol}:`, error.response?.data || error.message);
      }
    }
    console.log('All charts loaded:', Object.keys(charts));
    setMiniCharts(charts);
  };

  const changeTimeframe = async (symbol: string, timeframe: Timeframe) => {
    setSelectedTimeframes(prev => ({ ...prev, [symbol]: timeframe }));
    try {
      const response = await axios.get(`${API_URL}/portfolio/stock/${symbol}/chart`, {
        params: { range: timeframe }
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
      alert('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/portfolio/${portfolioId}/add-position`, {
        symbol: newPosition.symbol.toUpperCase(),
        quantity: parseFloat(newPosition.quantity),
        avgBuyPrice: parseFloat(newPosition.avgBuyPrice)
      });

      setNewPosition({ symbol: '', quantity: '', avgBuyPrice: '' });
      setShowAddPosition(false);
      await loadPortfolio();
    } catch (error) {
      console.error('Error adding position:', error);
      alert('Error adding position');
    } finally {
      setLoading(false);
    }
  };

  const deletePosition = async (positionId: number) => {
    if (!confirm('Remove this position from portfolio?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/portfolio/position/${positionId}`);
      await loadPortfolio();
    } catch (error) {
      console.error('Error deleting position:', error);
      alert('Error removing position');
    }
  };

  const runOptimization = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/portfolio/${portfolioId}/optimize`, {
        riskFreeRate: 0.02
      });
      
      setOptimization(response.data.optimization);
      setPositions(response.data.positions);
      alert('Optimization complete!');
    } catch (error) {
      console.error('Error optimizing:', error);
      alert('Error running optimization');
    } finally {
      setLoading(false);
    }
  };

  const calculateRebalancing = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/portfolio/${portfolioId}/rebalance`);
      setRebalanceActions(response.data);
    } catch (error: any) {
      console.error('Error calculating rebalancing:', error);
      alert(error.response?.data?.message || 'Error calculating rebalancing');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: 'EUR'
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

  return (
    <div className="min-h-screen bg-black text-white pb-24 overflow-x-hidden w-full max-w-full">
      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <p className="text-gray-500 text-sm">Portfolio</p>
        <h1 className="text-2xl font-semibold mt-1">Coconomics</h1>
      </div>

      {/* Total Value Card */}
      <div className="px-6 pb-6">
        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl p-8 shadow-2xl">
          <p className="text-cyan-100 text-sm mb-2 opacity-90">Current Value</p>
          <h2 className="text-5xl font-bold tracking-tight">{formatCurrency(totalValue)}</h2>
          {positions.length > 0 && (
            <div className="mt-6 pt-6 border-t border-white/20">
              <div className="flex justify-between items-center">
                <span className="text-cyan-100 text-sm opacity-90">Total Profit/Loss</span>
                <span className={`text-2xl font-bold ${
                  calculateTotalProfitLoss() >= 0 ? 'text-green-300' : 'text-red-300'
                }`}>
                  {calculateTotalProfitLoss() >= 0 ? '+' : ''}{formatCurrency(calculateTotalProfitLoss())}
                </span>
              </div>
            </div>
          )}
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
              // Ensure all values are properly parsed as numbers
              const quantity = parseFloat(position.quantity?.toString() || '0');
              const currentPrice = parseFloat(position.currentPrice?.toString() || '0');
              const avgBuyPrice = parseFloat(position.avgBuyPrice?.toString() || '0');

              const currentValue = quantity * currentPrice;
              const costBasis = quantity * avgBuyPrice;
              const profitLoss = currentValue - costBasis;
              const profitLossPercent = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;

              const recommendation = recommendations[position.asset.symbol];
              const chartData = miniCharts[position.asset.symbol];
              const chartPrices = chartData?.prices || [];
              const chartTimestamps = chartData?.timestamps || [];
              
              return (
                <div 
                  key={position.id} 
                  className="bg-zinc-900 rounded-xl p-4 border border-zinc-800"
                >
                  {/* Top: Symbol, Badge, Remove */}
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
                    <button
                      onClick={() => deletePosition(position.id)}
                      className="text-red-400 text-sm hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Value and P/L */}
                  <div className="mb-4">
                    {/* Live stock price per share */}
                    <div className="text-sm text-gray-400 mb-1">
                      €{currentPrice.toFixed(2)} per share
                    </div>
                    {/* Total value */}
                    <div className="text-xl font-bold mb-1">{formatCurrency(currentValue)}</div>
                    {/* Profit/Loss */}
                    {costBasis > 0 && (
                      <div className={`text-base font-semibold ${profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {profitLoss >= 0 ? '+' : ''}{formatCurrency(profitLoss)} ({profitLoss >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}%)
                      </div>
                    )}
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

                  {/* Debug info */}
                  {chartPrices.length === 0 && (
                    <div className="text-xs text-gray-500 mb-2 text-center">
                      Loading chart data...
                    </div>
                  )}

                  {/* Large Revolut-style Chart with Grid & Hover */}
                  {chartPrices.length > 1 && chartTimestamps.length > 1 ? (
                    <div className="relative mb-4">
                      {/* Chart container */}
                      <div
                        className="h-48 w-full rounded-xl overflow-hidden bg-black relative touch-none"
                        style={{ minHeight: '192px', WebkitTapHighlightColor: 'transparent' }}
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
                        <svg viewBox="0 0 400 180" className="w-full h-full" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: '100%' }}>
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
                  ) : chartPrices.length === 0 ? null : (
                    <div className="text-xs text-gray-500 mb-2 text-center p-4 bg-zinc-800 rounded-xl">
                      Chart unavailable - insufficient data
                    </div>
                  )}

                  {/* Bottom: Stats */}
                  <div className="flex justify-between text-xs text-gray-400 mb-3">
                    <span>{quantity.toFixed(2)} shares</span>
                    <span>Avg €{avgBuyPrice.toFixed(2)}</span>
                    <span>Now €{currentPrice.toFixed(2)}</span>
                  </div>

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
    </div>
  );
}
