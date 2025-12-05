'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { InlineLoader } from './LoadingSpinner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface PerformanceData {
  date: string;
  totalValue: number;
  cashBalance: number;
  positionsValue: number;
}

interface PortfolioPerformanceChartProps {
  token: string;
}

export default function PortfolioPerformanceChart({ token }: PortfolioPerformanceChartProps) {
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [totalWithdrawals, setTotalWithdrawals] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState(30);

  useEffect(() => {
    loadPerformanceData();
  }, [timeframe]);

  const loadPerformanceData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/portfolio/me/performance`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { days: timeframe }
      });
      // Backend now returns { snapshots, totalDeposits, totalWithdrawals }
      setPerformanceData(response.data.snapshots || response.data); // Backwards compatible
      setTotalDeposits(response.data.totalDeposits || 0);
      setTotalWithdrawals(response.data.totalWithdrawals || 0);
    } catch (error) {
      console.error('Error loading performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetPerformance = async () => {
    if (!confirm('Reset all performance data? This cannot be undone.')) return;
    try {
      await axios.delete(`${API_URL}/portfolio/me/performance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadPerformanceData();
    } catch (error) {
      console.error('Error resetting performance:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (timeframe <= 7) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' });
    } else if (timeframe <= 30) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }
  };

  const calculateChange = () => {
    if (performanceData.length === 0) return { amount: 0, percentage: 0 };

    // CORRECT P/L calculation: Current Value - Net Deposits
    // Net Deposits = Total Deposited - Total Withdrawn
    const currentValue = performanceData[performanceData.length - 1].totalValue;
    const netDeposits = totalDeposits - totalWithdrawals;
    const actualProfitLoss = currentValue - netDeposits;
    const percentage = netDeposits > 0 ? (actualProfitLoss / netDeposits) * 100 : 0;

    return { amount: actualProfitLoss, percentage };
  };

  const change = calculateChange();

  return (
    <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-bold mb-2">Portfolio Performance</h3>
          {performanceData.length > 1 && (
            <div className="flex items-baseline gap-3">
              <span className={`text-2xl font-bold ${change.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {change.amount >= 0 ? '+' : ''}{formatCurrency(change.amount)}
              </span>
              <span className={`text-lg font-semibold ${change.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ({change.amount >= 0 ? '+' : ''}{change.percentage.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {[7, 30, 90, 365].map((days) => (
            <button
              key={days}
              onClick={() => setTimeframe(days)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                timeframe === days
                  ? 'bg-cyan-500 text-white'
                  : 'bg-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              {days === 7 ? '7D' : days === 30 ? '1M' : days === 90 ? '3M' : '1Y'}
            </button>
          ))}
          <button
            onClick={resetPerformance}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-transparent text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            Reset
          </button>
        </div>
      </div>

      {loading ? (
        <InlineLoader message="Loading performance data..." />
      ) : performanceData.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-2">No performance data yet</p>
          <p className="text-gray-600 text-sm">Performance tracking will start after your first transaction</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatCurrency}
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '12px',
                  padding: '12px'
                }}
                labelStyle={{ color: '#9ca3af', fontSize: '12px' }}
                itemStyle={{ color: '#06b6d4', fontSize: '14px', fontWeight: 'bold' }}
                formatter={(value: number) => [formatCurrency(value), 'Portfolio Value']}
                labelFormatter={(label) => formatDate(label)}
              />
              <Area
                type="monotone"
                dataKey="totalValue"
                stroke="#06b6d4"
                strokeWidth={3}
                fill="url(#colorValue)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="mt-6 flex justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
              <span className="text-sm text-gray-400">Total Value</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-400">Positions</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm text-gray-400">Cash</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
