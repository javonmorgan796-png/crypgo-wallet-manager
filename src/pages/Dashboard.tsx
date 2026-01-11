import { ArrowUpRight, ArrowDownRight, TrendingUp, Wallet, Activity, Users, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PortfolioChart } from '@/components/charts/PortfolioChart';
import { useAuth } from '@/contexts/AuthContext';
import { useUserData } from '@/hooks/useUserData';
import { investmentPlans, mockTraders } from '@/data/mockData';

export default function Dashboard() {
  const { user } = useAuth();
  const { balance, totalProfit, totalInvested, transactions, isLoading } = useUserData();

  // Get recent transactions (last 5)
  const recentTransactions = transactions.slice(0, 5);

  // Calculate active copy trades count (placeholder until we have real data)
  const activeCopyTradesCount = 0;

  const portfolioData = [
    {
      title: 'Total Balance',
      value: `$${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: balance > 0 ? '+' + ((totalProfit / (balance || 1)) * 100).toFixed(1) + '%' : '0%',
      isPositive: totalProfit >= 0,
      icon: Wallet,
    },
    {
      title: 'Total Invested',
      value: `$${totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: totalInvested > 0 ? 'Active' : 'None',
      isPositive: true,
      icon: TrendingUp,
    },
    {
      title: 'Total Profit',
      value: `$${totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: totalProfit > 0 ? '+' + ((totalProfit / (totalInvested || 1)) * 100).toFixed(1) + '%' : '0%',
      isPositive: totalProfit >= 0,
      icon: Activity,
    },
    {
      title: 'Active Copy Trades',
      value: activeCopyTradesCount.toString(),
      change: activeCopyTradesCount > 0 ? `${activeCopyTradesCount} traders` : 'None',
      isPositive: true,
      icon: Users,
    },
  ];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user?.name || 'User'}</p>
          </div>
          <div className="flex gap-3">
            <Link to="/investments">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                New Investment
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {portfolioData.map((stat, index) => (
            <Card key={index} className="bg-card border-border hover:border-primary/30 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${stat.isPositive ? 'text-primary' : 'text-destructive'}`}>
                    {stat.isPositive ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                    {stat.change}
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Portfolio Chart */}
        <PortfolioChart />

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Active Investments - Placeholder until we have investment data */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display text-xl">Active Investments</CardTitle>
              <Link to="/investments">
                <Button variant="ghost" size="sm" className="text-primary">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8">
                <p className="text-muted-foreground">No active investments</p>
                <Link to="/investments">
                  <Button variant="link" className="text-primary mt-2">
                    Start Investing
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Copy Trade Status - Placeholder */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display text-xl">Copy Trade Status</CardTitle>
              <Link to="/copy-trade">
                <Button variant="ghost" size="sm" className="text-primary">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8">
                <p className="text-muted-foreground">No active copy trades</p>
                <Link to="/copy-trade">
                  <Button variant="link" className="text-primary mt-2">
                    Find Traders
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-xl">Recent Transactions</CardTitle>
            <Link to="/transactions">
              <Button variant="ghost" size="sm" className="text-primary">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between py-3 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          transaction.amount >= 0
                            ? 'bg-primary/10 text-primary'
                            : 'bg-destructive/10 text-destructive'
                        }`}
                      >
                        {transaction.amount >= 0 ? (
                          <ArrowDownRight className="h-5 w-5" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground capitalize">
                          {transaction.type.replace('-', ' ')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          transaction.amount >= 0 ? 'text-primary' : 'text-foreground'
                        }`}
                      >
                        {transaction.amount >= 0 ? '+' : ''}${Math.abs(transaction.amount).toLocaleString()}
                      </p>
                      <p
                        className={`text-xs capitalize ${
                          transaction.status === 'completed'
                            ? 'text-primary'
                            : transaction.status === 'pending'
                            ? 'text-warning'
                            : 'text-destructive'
                        }`}
                      >
                        {transaction.status}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No transactions yet</p>
                  <Link to="/wallet">
                    <Button variant="link" className="text-primary mt-2">
                      Make a Deposit
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
