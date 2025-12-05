'use client';

import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface SectorAllocationChartProps {
  token: string | null;
}

interface SectorData {
  name: string;
  value: number;
  percentage: number;
}

// Color palette for sectors
const SECTOR_COLORS: Record<string, string> = {
  'Technology': '#3b82f6',
  'Healthcare': '#10b981',
  'Finance': '#f59e0b',
  'Consumer': '#ec4899',
  'Energy': '#ef4444',
  'Industrial': '#8b5cf6',
  'Materials': '#14b8a6',
  'Utilities': '#6366f1',
  'Real Estate': '#f97316',
  'Telecommunications': '#06b6d4',
  'Other': '#64748b'
};

const getSectorFromSymbol = (symbol: string): string => {
  // Simple sector mapping - you can expand this
  const sectorMap: Record<string, string> = {
    'AAPL': 'Technology',
    'MSFT': 'Technology',
    'GOOGL': 'Technology',
    'GOOG': 'Technology',
    'AMZN': 'Consumer',
    'NVDA': 'Technology',
    'TSLA': 'Consumer',
    'META': 'Technology',
    'BRK.B': 'Finance',
    'V': 'Finance',
    'JPM': 'Finance',
    'JNJ': 'Healthcare',
    'WMT': 'Consumer',
    'PG': 'Consumer',
    'MA': 'Finance',
    'HD': 'Consumer',
    'BAC': 'Finance',
    'XOM': 'Energy',
    'CVX': 'Energy',
    'ABBV': 'Healthcare',
    'PFE': 'Healthcare',
    'KO': 'Consumer',
    'PEP': 'Consumer',
    'COST': 'Consumer',
    'AVGO': 'Technology',
    'NFLX': 'Technology',
    'CSCO': 'Technology',
    'INTC': 'Technology',
    'AMD': 'Technology',
    'QCOM': 'Technology',
    'TXN': 'Technology',
    'HON': 'Industrial',
    'UPS': 'Industrial',
    'CAT': 'Industrial',
    'GE': 'Industrial',
    'BA': 'Industrial',
    'MMM': 'Industrial',
    'NEE': 'Utilities',
    'DUK': 'Utilities',
    'SO': 'Utilities',
    'D': 'Utilities'
  };

  return sectorMap[symbol.toUpperCase()] || 'Other';
};

export default function SectorAllocationChart({ token }: SectorAllocationChartProps) {
  const [sectorData, setSectorData] = useState<SectorData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      loadSectorData();
    }
  }, [token]);

  const loadSectorData = async () => {
    try {
      const response = await axios.get(`${API_URL}/portfolio/me/live-prices`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const positions = response.data;

      // Group by sector
      const sectorTotals: Record<string, number> = {};
      let totalValue = 0;

      positions.forEach((position: any) => {
        const sector = getSectorFromSymbol(position.asset.symbol);
        const value = position.quantity * position.currentPrice;
        sectorTotals[sector] = (sectorTotals[sector] || 0) + value;
        totalValue += value;
      });

      // Convert to array and calculate percentages
      const data: SectorData[] = Object.entries(sectorTotals)
        .map(([name, value]) => ({
          name,
          value,
          percentage: (value / totalValue) * 100
        }))
        .sort((a, b) => b.value - a.value);

      setSectorData(data);
    } catch (error) {
      console.error('Error loading sector data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-black/95 border border-white/20 rounded-lg px-4 py-3">
          <p className="text-white font-semibold">{data.name}</p>
          <p className="text-gray-300">{formatCurrency(data.value)}</p>
          <p className="text-gray-400 text-sm">{data.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 rounded-3xl border border-white/10 p-6">
        <h2 className="text-lg font-semibold mb-4">Sector Allocation</h2>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  if (sectorData.length === 0) {
    return null;
  }

  return (
    <div className="bg-zinc-900 rounded-3xl border border-white/10 p-6">
      <h2 className="text-lg font-semibold mb-4">Sector Allocation</h2>

      <div className="flex flex-col lg:flex-row items-center gap-6">
        {/* Pie Chart */}
        <div className="w-full lg:w-1/2">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sectorData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {sectorData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={SECTOR_COLORS[entry.name] || SECTOR_COLORS['Other']}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend with values */}
        <div className="w-full lg:w-1/2 grid grid-cols-1 gap-3">
          {sectorData.map((sector, index) => (
            <div
              key={sector.name}
              className="flex items-center justify-between p-3 bg-zinc-800 rounded-xl border border-white/5"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: SECTOR_COLORS[sector.name] || SECTOR_COLORS['Other'] }}
                />
                <span className="text-sm font-medium">{sector.name}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{formatCurrency(sector.value)}</div>
                <div className="text-xs text-gray-400">{sector.percentage.toFixed(1)}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
