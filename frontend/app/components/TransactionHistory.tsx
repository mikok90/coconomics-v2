'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import LoadingSpinner, { InlineLoader } from './LoadingSpinner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

interface TransactionHistoryProps {
  token: string;
  onClose: () => void;
}

export default function TransactionHistory({ token, onClose }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/portfolio/me/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 100 }
      });
      setTransactions(response.data);
    } catch (error) {
      console.error('Error loading transactions:', error);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'BUY':
        return '📈';
      case 'SELL':
        return '📉';
      case 'DEPOSIT':
        return '💰';
      case 'WITHDRAWAL':
        return '💸';
      default:
        return '📝';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'BUY':
        return 'text-green-400';
      case 'SELL':
        return 'text-red-400';
      case 'DEPOSIT':
        return 'text-cyan-400';
      case 'WITHDRAWAL':
        return 'text-orange-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-end justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-zinc-900 rounded-t-3xl w-full max-w-2xl border-t border-white/10 animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-zinc-800 flex-shrink-0">
          <div className="w-12 h-1 bg-gray-700 rounded-full mx-auto mb-6"></div>
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-semibold">Transaction History</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <InlineLoader message="Loading transactions..." />
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-2">No transactions yet</p>
              <p className="text-gray-600 text-sm">Your buy and sell history will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700 hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-2xl mt-0.5">{getTransactionIcon(transaction.type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-bold ${getTransactionColor(transaction.type)}`}>
                            {transaction.type}
                          </span>
                          {transaction.symbol && (
                            <span className="text-white font-semibold">{transaction.symbol}</span>
                          )}
                        </div>
                        {transaction.quantity && transaction.price && (
                          <p className="text-sm text-gray-400 mb-1">
                            {transaction.quantity} shares @ {formatCurrency(transaction.price)}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">{formatDate(transaction.createdAt)}</p>
                        {transaction.notes && (
                          <p className="text-xs text-gray-400 mt-2 italic">{transaction.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        transaction.type === 'BUY' || transaction.type === 'WITHDRAWAL'
                          ? 'text-red-400'
                          : 'text-green-400'
                      }`}>
                        {transaction.type === 'BUY' || transaction.type === 'WITHDRAWAL' ? '-' : '+'}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Balance: {formatCurrency(transaction.cashBalanceAfter)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
