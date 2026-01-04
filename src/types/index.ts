export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  balance: number;
  totalProfit: number;
  totalInvested: number;
  createdAt: string;
}

export interface Investment {
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

export interface InvestmentPlan {
  id: string;
  name: string;
  type: 'fixed' | 'flexible' | 'time-based';
  minAmount: number;
  maxAmount: number;
  roi: number;
  duration: number; // in days
  description: string;
  features: string[];
  popular?: boolean;
}

export interface Trader {
  id: string;
  name: string;
  avatar: string;
  winRate: number;
  totalProfit: number;
  profitPercentage: number;
  followers: number;
  trades: number;
  riskLevel: 'low' | 'medium' | 'high';
  specialization: string;
  isFollowing?: boolean;
  monthlyReturns: number[];
}

export interface CopyTrade {
  id: string;
  traderId: string;
  traderName: string;
  userId: string;
  amount: number;
  startDate: string;
  profit: number;
  profitPercentage: number;
  status: 'active' | 'stopped';
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'investment' | 'profit' | 'copy-trade';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  createdAt: string;
  reference?: string;
}

export interface CryptoPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  icon: string;
}