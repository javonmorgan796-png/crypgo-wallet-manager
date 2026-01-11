import { useState, useEffect, useCallback } from 'react';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface UserData {
  balance: number;
  totalProfit: number;
  totalInvested: number;
  transactions: Transaction[];
  investments: Investment[];
  copyTrades: CopyTrade[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'investment' | 'profit' | 'copy-trade' | 'referral';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  createdAt: string;
  reference?: string;
}

interface Investment {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  amount: number;
  expectedReturn: number;
  roi: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'cancelled';
  type: 'fixed' | 'flexible' | 'time-based';
}

interface CopyTrade {
  id: string;
  traderId: string;
  traderName: string;
  userId: string;
  amount: number;
  startDate: string;
  profit: number;
  profitPercentage: number;
  status: 'active' | 'paused' | 'stopped';
}

export function useUserData(): UserData {
  const { user, isAuthenticated } = useAuth();
  const [balance, setBalance] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalInvested, setTotalInvested] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [copyTrades, setCopyTrades] = useState<CopyTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [balanceResult, transactionsResult] = await Promise.all([
        api.getWalletBalance(),
        api.getTransactions(),
      ]);

      if (balanceResult.success && balanceResult.data) {
        setBalance(balanceResult.data.balance || 0);
      }

      if (transactionsResult.success && transactionsResult.data) {
        const txData = Array.isArray(transactionsResult.data) 
          ? transactionsResult.data 
          : (transactionsResult.data as any).transactions || [];
        
        setTransactions(txData.map((tx: any) => ({
          id: tx._id || tx.id,
          userId: tx.userId,
          type: tx.type,
          amount: tx.amount,
          status: tx.status,
          description: tx.description || `${tx.type} transaction`,
          createdAt: tx.createdAt,
          reference: tx.reference,
        })));

        // Calculate totals from transactions
        const profits = txData
          .filter((t: any) => t.type === 'profit' && t.status === 'completed')
          .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
        
        const invested = txData
          .filter((t: any) => t.type === 'investment' && t.status === 'completed')
          .reduce((sum: number, t: any) => sum + Math.abs(t.amount || 0), 0);

        setTotalProfit(profits);
        setTotalInvested(invested);
      }

      // Use user data from auth context if available
      if (user) {
        setBalance(user.balance || 0);
        setTotalProfit(user.totalProfit || 0);
        setTotalInvested(user.totalInvested || 0);
      }

    } catch (err) {
      console.error('Failed to fetch user data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    balance,
    totalProfit,
    totalInvested,
    transactions,
    investments,
    copyTrades,
    isLoading,
    error,
    refresh: fetchData,
  };
}

export function useTransactions(filters?: {
  type?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await api.getTransactions(filters);
      
      if (result.success && result.data) {
        const txData = Array.isArray(result.data) 
          ? result.data 
          : (result.data as any).transactions || [];
        
        setTransactions(txData.map((tx: any) => ({
          id: tx._id || tx.id,
          userId: tx.userId,
          type: tx.type,
          amount: tx.amount,
          status: tx.status,
          description: tx.description || `${tx.type} transaction`,
          createdAt: tx.createdAt,
          reference: tx.reference,
        })));
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setError('Failed to load transactions.');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return { transactions, isLoading, error, refresh: fetchTransactions };
}
