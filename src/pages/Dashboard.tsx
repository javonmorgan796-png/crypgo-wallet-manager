import { ArrowUpRight, ArrowDownRight, TrendingUp, Wallet, Activity, Users } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mockUser, mockInvestments, mockCopyTrades, mockTransactions } from '@/data/mockData';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PortfolioChart } from '@/components/charts/PortfolioChart';

export default function Dashboard() {
  const activeInvestments = mockInvestments.filter(inv => inv.status === 'active');
  const recentTransactions = mockTransactions.slice(0, 5);

  const portfolioData = [
    {
      title: 'Total Balance',
      value: `$${mockUser.balance.toLocaleString()}`,
      change: '+12.5%',
      isPositive: true,
      icon: Wallet,
    },
    {
      title: 'Total Invested',
      value: `$${mockUser.totalInvested.toLocaleString()}`,
      change: '+8.2%',
      isPositive: true,
      icon: TrendingUp,
    },
    {
      title: 'Total Profit',
      value: `$${mockUser.totalProfit.toLocaleString()}`,
      change: '+24.3%',
      isPositive: true,
      icon: Activity,
    },
    {
      title: 'Active Copy Trades',
      value: mockCopyTrades.filter(ct => ct.status === 'active').length.toString(),
      change: '2 traders',
      isPositive: true,
      icon: Users,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {mockUser.name}</p>
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
          {/* Active Investments */}
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
              {activeInvestments.length > 0 ? (
                activeInvestments.map((investment) => (
                  <div
                    key={investment.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/50"
                  >
                    <div>
                      <p className="font-medium text-foreground">{investment.planName}</p>
                      <p className="text-sm text-muted-foreground">
                        Invested: ${investment.amount.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">+{investment.roi}% ROI</p>
                      <p className="text-sm text-muted-foreground">
                        Expected: ${investment.expectedReturn.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No active investments</p>
                  <Link to="/investments">
                    <Button variant="link" className="text-primary mt-2">
                      Start Investing
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Copy Trade Status */}
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
              {mockCopyTrades.filter(ct => ct.status === 'active').length > 0 ? (
                mockCopyTrades
                  .filter((ct) => ct.status === 'active')
                  .map((trade) => (
                    <div
                      key={trade.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-secondary/50"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${trade.traderName}`}
                          alt={trade.traderName}
                          className="h-10 w-10 rounded-full border border-border"
                        />
                        <div>
                          <p className="font-medium text-foreground">{trade.traderName}</p>
                          <p className="text-sm text-muted-foreground">
                            Amount: ${trade.amount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">
                          +${trade.profit.toLocaleString()}
                        </p>
                        <p className="text-sm text-primary">+{trade.profitPercentage}%</p>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No active copy trades</p>
                  <Link to="/copy-trade">
                    <Button variant="link" className="text-primary mt-2">
                      Find Traders
                    </Button>
                  </Link>
                </div>
              )}
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
              {recentTransactions.map((transaction) => (
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
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}