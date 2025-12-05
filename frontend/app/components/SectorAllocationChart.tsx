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
  // Comprehensive sector mapping for 500+ stocks
  const sectorMap: Record<string, string> = {
    // Technology - FAANG, Semiconductors, Software, Hardware
    'AAPL': 'Technology', 'MSFT': 'Technology', 'GOOGL': 'Technology', 'GOOG': 'Technology',
    'META': 'Technology', 'NVDA': 'Technology', 'AMD': 'Technology', 'INTC': 'Technology',
    'QCOM': 'Technology', 'AVGO': 'Technology', 'TXN': 'Technology', 'ADI': 'Technology',
    'NFLX': 'Technology', 'CSCO': 'Technology', 'ORCL': 'Technology', 'ADBE': 'Technology',
    'CRM': 'Technology', 'ACN': 'Technology', 'IBM': 'Technology', 'INTU': 'Technology',
    'NOW': 'Technology', 'UBER': 'Technology', 'SHOP': 'Technology', 'SQ': 'Technology',
    'PYPL': 'Technology', 'SNOW': 'Technology', 'TEAM': 'Technology', 'ZM': 'Technology',
    'DOCU': 'Technology', 'DDOG': 'Technology', 'CRWD': 'Technology', 'NET': 'Technology',
    'MU': 'Technology', 'AMAT': 'Technology', 'LRCX': 'Technology', 'KLAC': 'Technology',
    'MRVL': 'Technology', 'ASML': 'Technology', 'TSM': 'Technology', 'SPOT': 'Technology',
    'RBLX': 'Technology', 'U': 'Technology', 'PLTR': 'Technology', 'PANW': 'Technology',

    // Healthcare - Pharma, Biotech, Devices
    'JNJ': 'Healthcare', 'UNH': 'Healthcare', 'PFE': 'Healthcare', 'ABBV': 'Healthcare',
    'TMO': 'Healthcare', 'ABT': 'Healthcare', 'DHR': 'Healthcare', 'MRK': 'Healthcare',
    'LLY': 'Healthcare', 'BMY': 'Healthcare', 'AMGN': 'Healthcare', 'GILD': 'Healthcare',
    'CVS': 'Healthcare', 'CI': 'Healthcare', 'HUM': 'Healthcare', 'ISRG': 'Healthcare',
    'SYK': 'Healthcare', 'BSX': 'Healthcare', 'MDT': 'Healthcare', 'ZTS': 'Healthcare',
    'REGN': 'Healthcare', 'VRTX': 'Healthcare', 'BIIB': 'Healthcare', 'ILMN': 'Healthcare',
    'MRNA': 'Healthcare', 'BNTX': 'Healthcare', 'DXCM': 'Healthcare', 'EW': 'Healthcare',

    // Finance - Banks, Insurance, Payments, Brokers
    'BRK.B': 'Finance', 'BRK-B': 'Finance', 'JPM': 'Finance', 'BAC': 'Finance', 'WFC': 'Finance',
    'MS': 'Finance', 'GS': 'Finance', 'C': 'Finance', 'BLK': 'Finance', 'SCHW': 'Finance',
    'AXP': 'Finance', 'V': 'Finance', 'MA': 'Finance', 'PNC': 'Finance', 'USB': 'Finance',
    'TFC': 'Finance', 'COF': 'Finance', 'BK': 'Finance', 'STT': 'Finance', 'SPGI': 'Finance',
    'MCO': 'Finance', 'CME': 'Finance', 'ICE': 'Finance', 'NDAQ': 'Finance', 'CB': 'Finance',
    'PGR': 'Finance', 'TRV': 'Finance', 'ALL': 'Finance', 'MET': 'Finance', 'PRU': 'Finance',
    'AIG': 'Finance', 'HIG': 'Finance', 'AFL': 'Finance', 'COIN': 'Finance', 'HOOD': 'Finance',

    // Consumer - Retail, Restaurants, Discretionary, Staples
    'AMZN': 'Consumer', 'TSLA': 'Consumer', 'WMT': 'Consumer', 'HD': 'Consumer', 'MCD': 'Consumer',
    'NKE': 'Consumer', 'SBUX': 'Consumer', 'TGT': 'Consumer', 'LOW': 'Consumer', 'COST': 'Consumer',
    'TJX': 'Consumer', 'DG': 'Consumer', 'ROST': 'Consumer', 'BBY': 'Consumer', 'YUM': 'Consumer',
    'PG': 'Consumer', 'KO': 'Consumer', 'PEP': 'Consumer', 'PM': 'Consumer', 'MO': 'Consumer',
    'CL': 'Consumer', 'KMB': 'Consumer', 'GIS': 'Consumer', 'K': 'Consumer', 'HSY': 'Consumer',
    'MDLZ': 'Consumer', 'STZ': 'Consumer', 'TAP': 'Consumer', 'DIS': 'Consumer', 'CMCSA': 'Consumer',
    'NFLX': 'Consumer', 'GM': 'Consumer', 'F': 'Consumer', 'RACE': 'Consumer', 'LCID': 'Consumer',
    'RIVN': 'Consumer', 'NIO': 'Consumer', 'XPEV': 'Consumer', 'LI': 'Consumer', 'BABA': 'Consumer',

    // Energy - Oil, Gas, Renewables
    'XOM': 'Energy', 'CVX': 'Energy', 'COP': 'Energy', 'SLB': 'Energy', 'EOG': 'Energy',
    'PSX': 'Energy', 'VLO': 'Energy', 'MPC': 'Energy', 'OXY': 'Energy', 'HES': 'Energy',
    'HAL': 'Energy', 'BKR': 'Energy', 'DVN': 'Energy', 'FANG': 'Energy', 'MRO': 'Energy',
    'APA': 'Energy', 'ENPH': 'Energy', 'SEDG': 'Energy', 'RUN': 'Energy', 'NOVA': 'Energy',

    // Industrial - Aerospace, Machinery, Defense, Transportation
    'BA': 'Industrial', 'HON': 'Industrial', 'UPS': 'Industrial', 'CAT': 'Industrial', 'GE': 'Industrial',
    'MMM': 'Industrial', 'LMT': 'Industrial', 'RTX': 'Industrial', 'GD': 'Industrial', 'NOC': 'Industrial',
    'LHX': 'Industrial', 'DE': 'Industrial', 'EMR': 'Industrial', 'ETN': 'Industrial', 'ITW': 'Industrial',
    'PH': 'Industrial', 'CMI': 'Industrial', 'FDX': 'Industrial', 'UBER': 'Industrial', 'LYFT': 'Industrial',
    'DAL': 'Industrial', 'UAL': 'Industrial', 'AAL': 'Industrial', 'LUV': 'Industrial', 'JBLU': 'Industrial',

    // Materials - Chemicals, Mining, Steel
    'LIN': 'Materials', 'APD': 'Materials', 'ECL': 'Materials', 'DD': 'Materials', 'DOW': 'Materials',
    'NEM': 'Materials', 'FCX': 'Materials', 'GOLD': 'Materials', 'AA': 'Materials', 'X': 'Materials',
    'NUE': 'Materials', 'STLD': 'Materials', 'VMC': 'Materials', 'MLM': 'Materials',

    // Utilities - Electric, Water, Gas
    'NEE': 'Utilities', 'DUK': 'Utilities', 'SO': 'Utilities', 'D': 'Utilities', 'AEP': 'Utilities',
    'EXC': 'Utilities', 'XEL': 'Utilities', 'ED': 'Utilities', 'SRE': 'Utilities', 'PEG': 'Utilities',
    'ES': 'Utilities', 'AWK': 'Utilities', 'ATO': 'Utilities', 'WEC': 'Utilities', 'DTE': 'Utilities',

    // Real Estate - REITs
    'AMT': 'Real Estate', 'PLD': 'Real Estate', 'CCI': 'Real Estate', 'EQIX': 'Real Estate', 'PSA': 'Real Estate',
    'WELL': 'Real Estate', 'DLR': 'Real Estate', 'O': 'Real Estate', 'SPG': 'Real Estate', 'AVB': 'Real Estate',
    'EQR': 'Real Estate', 'VTR': 'Real Estate', 'SBAC': 'Real Estate', 'ARE': 'Real Estate',

    // Telecommunications
    'T': 'Telecommunications', 'VZ': 'Telecommunications', 'TMUS': 'Telecommunications', 'CHTR': 'Telecommunications',
    'DIS': 'Telecommunications', 'CMCSA': 'Telecommunications', 'DISH': 'Telecommunications'
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
