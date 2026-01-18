import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  DollarSign, 
  FileCheck, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  LogOut,
  LayoutDashboard,
  UserCheck,
  Receipt,
  MessageSquare,
  Settings,
  TrendingUp,
  PieChart,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '@/services/api';
import logo from '@/assets/logo.png';
import { toast } from 'sonner';

// Import admin sub-components
import { AdminUsers } from './AdminUsers';
import { AdminKYC } from './AdminKYC';
import { AdminTransactions } from './AdminTransactions';
import { AdminNotifications } from './AdminNotifications';
import { AdminSettings } from './AdminSettings';
import { AdminTraders } from './AdminTraders';
import { AdminInvestmentPlans } from './AdminInvestmentPlans';

// Import error boundary and chart states
import { ErrorBoundary, ChartErrorBoundary } from '@/components/admin/ErrorBoundary';
import { ChartEmptyState } from '@/components/admin/ChartEmptyState';
import { ChartLoadingState } from '@/components/admin/ChartLoadingState';
import { AdminMobileNav } from '@/components/admin/AdminMobileNav';
import { useAdminWebSocket } from '@/hooks/useAdminWebSocket';

// Safe formatter for tooltip values
const safeToLocaleString = (value: unknown): string => {
  if (value === null || value === undefined) return '0';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'string') return parseFloat(value).toLocaleString() || '0';
  return '0';
};

const CHART_COLORS = ['hsl(142, 76%, 36%)', 'hsl(200, 70%, 50%)', 'hsl(45, 90%, 50%)', 'hsl(280, 60%, 50%)', 'hsl(350, 70%, 50%)'];

export default function AdminDashboard() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [period, setPeriod] = useState('30');
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingKYC: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    activeInvestments: 0,
    totalInvestmentValue: 0,
  });
  const [analytics, setAnalytics] = useState({
    dailyDeposits: [],
    dailyWithdrawals: [],
    dailyUsers: [],
    dailyInvestments: [],
    investmentByPlan: [],
    userGrowth: [],
  });

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStats = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const result = await api.adminGetDashboardStats();
      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async (silent = false) => {
    if (!silent) setAnalyticsLoading(true);
    try {
      const result = await api.adminGetDashboardAnalytics(period);
      if (result.success && result.data) {
        setAnalytics(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      if (!silent) setAnalyticsLoading(false);
    }
  }, [period]);

  const refreshData = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    await Promise.all([fetchStats(silent), fetchAnalytics(silent)]);
    setLastRefresh(new Date());
    if (!silent) {
      setIsRefreshing(false);
      toast.success('Dashboard data refreshed');
    }
  }, [fetchStats, fetchAnalytics]);

  // Initial data fetch
  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    refreshData(false);
  }, [isAdmin, navigate]);

  // Refetch analytics when period changes
  useEffect(() => {
    fetchAnalytics(false);
  }, [period]);

  // WebSocket for real-time updates
  const { isConnected: wsConnected } = useAdminWebSocket((event) => {
    // Auto-refresh data when new events arrive
    if (['new_deposit', 'new_withdrawal', 'new_kyc', 'new_user', 'new_investment'].includes(event.event)) {
      refreshData(true);
    }
  });

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        refreshData(true);
      }, 30000);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshData]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAdmin) {
    return null;
  }

  // Prepare chart data
  const depositWithdrawalData = analytics.dailyDeposits.map((dep: any) => {
    const withdrawal = analytics.dailyWithdrawals.find((w: any) => w._id === dep._id);
    return {
      date: dep._id,
      deposits: dep.total,
      withdrawals: withdrawal?.total || 0,
    };
  });

  const userGrowthData = analytics.userGrowth.map((day: any) => ({
    date: day.date,
    users: day.total,
    newUsers: day.newUsers,
  }));

  const investmentPlanData = analytics.investmentByPlan.map((plan: any) => ({
    name: plan._id || 'Unknown',
    value: plan.total,
    count: plan.count,
  }));

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'traders', label: 'Traders', icon: TrendingUp },
    { id: 'investment-plans', label: 'Investment Plans', icon: DollarSign },
    { id: 'kyc', label: 'KYC Requests', icon: UserCheck },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'notifications', label: 'Notifications', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Navigation */}
      <AdminMobileNav 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        stats={stats}
      />

      {/* Sidebar - Hidden on mobile */}
      <aside className="w-64 bg-card border-r border-border p-4 flex-col hidden lg:flex">
        <div className="flex items-center gap-3 mb-8 px-2">
          <img src={logo} alt="Green Bull" className="h-10 w-10" />
          <div>
            <h1 className="font-bold text-lg">Green Bull</h1>
            <div className="flex items-center gap-1">
              <p className="text-xs text-muted-foreground">Admin Panel</p>
              {wsConnected ? (
                <Wifi className="h-3 w-3 text-primary" />
              ) : (
                <WifiOff className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
              {item.id === 'kyc' && stats.pendingKYC > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {stats.pendingKYC}
                </Badge>
              )}
              {item.id === 'transactions' && (stats.pendingDeposits + stats.pendingWithdrawals) > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {stats.pendingDeposits + stats.pendingWithdrawals}
                </Badge>
              )}
            </button>
          ))}
        </nav>

        <div className="pt-4 border-t border-border">
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8 overflow-auto pt-20 lg:pt-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold">Dashboard Overview</h2>
                <p className="text-muted-foreground">Welcome back, {user?.name}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Last update: {lastRefresh.toLocaleTimeString()}</span>
                  {autoRefresh && (
                    <Badge variant="secondary" className="text-xs">
                      Auto-refresh ON
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={autoRefresh ? 'border-primary text-primary' : ''}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
                  {autoRefresh ? 'Auto' : 'Manual'}
                </Button>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={() => refreshData(false)} 
                  variant="outline" 
                  size="sm"
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-1">Refresh</span>
                </Button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Users
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : stats.totalUsers.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeUsers} active in last 30 days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Investments
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : stats.activeInvestments}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ${stats.totalInvestmentValue.toLocaleString()} invested
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Deposits
                  </CardTitle>
                  <ArrowUpRight className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : `$${stats.totalDeposits.toLocaleString()}`}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.pendingDeposits} pending
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Withdrawals
                  </CardTitle>
                  <ArrowDownRight className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : `$${stats.totalWithdrawals.toLocaleString()}`}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.pendingWithdrawals} pending
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Deposits vs Withdrawals Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Deposits vs Withdrawals
                  </CardTitle>
                  <CardDescription>Daily transaction volume</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartErrorBoundary chartName="Deposits vs Withdrawals">
                    {analyticsLoading ? (
                      <ChartLoadingState variant="skeleton" />
                    ) : depositWithdrawalData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={depositWithdrawalData}>
                          <defs>
                            <linearGradient id="colorDeposits" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorWithdrawals" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(0, 70%, 50%)" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="hsl(0, 70%, 50%)" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                            formatter={(value) => [`$${safeToLocaleString(value)}`, '']}
                          />
                          <Legend />
                          <Area 
                            type="monotone" 
                            dataKey="deposits" 
                            stroke="hsl(142, 76%, 36%)" 
                            fillOpacity={1} 
                            fill="url(#colorDeposits)" 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="withdrawals" 
                            stroke="hsl(0, 70%, 50%)" 
                            fillOpacity={1} 
                            fill="url(#colorWithdrawals)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <ChartEmptyState 
                        icon={DollarSign} 
                        title="No transaction data" 
                        description="Deposits and withdrawals will appear here."
                      />
                    )}
                  </ChartErrorBoundary>
                </CardContent>
              </Card>

              {/* User Growth Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    User Growth
                  </CardTitle>
                  <CardDescription>Cumulative user registrations</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartErrorBoundary chartName="User Growth">
                    {analyticsLoading ? (
                      <ChartLoadingState variant="skeleton" />
                    ) : userGrowthData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={userGrowthData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                            formatter={(value) => [safeToLocaleString(value), '']}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="users" 
                            stroke="hsl(142, 76%, 36%)" 
                            strokeWidth={2}
                            dot={false}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="newUsers" 
                            stroke="hsl(200, 70%, 50%)" 
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <ChartEmptyState 
                        icon={Users} 
                        title="No user data" 
                        description="User growth will appear here as users sign up."
                      />
                    )}
                  </ChartErrorBoundary>
                </CardContent>
              </Card>
            </div>

            {/* Second Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Investment by Plan */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Investment by Plan
                  </CardTitle>
                  <CardDescription>Distribution of active investments</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartErrorBoundary chartName="Investment by Plan">
                    {analyticsLoading ? (
                      <ChartLoadingState />
                    ) : investmentPlanData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                          <Pie
                            data={investmentPlanData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name || 'Unknown'} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {investmentPlanData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                            formatter={(value) => [`$${safeToLocaleString(value)}`, 'Amount']}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <ChartEmptyState 
                        icon={PieChart} 
                        title="No investment plans" 
                        description="Investment distribution will appear here."
                      />
                    )}
                  </ChartErrorBoundary>
                </CardContent>
              </Card>

              {/* Daily Investments Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Daily Investments
                  </CardTitle>
                  <CardDescription>New investments per day</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartErrorBoundary chartName="Daily Investments">
                    {analyticsLoading ? (
                      <ChartLoadingState variant="skeleton" />
                    ) : analytics.dailyInvestments.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analytics.dailyInvestments}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="_id" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                            formatter={(value) => [`$${safeToLocaleString(value)}`, 'Amount']}
                          />
                          <Bar dataKey="total" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ChartEmptyState 
                        icon={TrendingUp} 
                        title="No investment data" 
                        description="Daily investments will appear here."
                      />
                    )}
                  </ChartErrorBoundary>
                </CardContent>
              </Card>
            </div>

            {/* Pending Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-yellow-500/20 bg-yellow-500/5">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Pending KYC</CardTitle>
                  <FileCheck className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-500">{stats.pendingKYC}</div>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-yellow-500"
                    onClick={() => setActiveTab('kyc')}
                  >
                    Review requests →
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-blue-500/20 bg-blue-500/5">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Pending Deposits</CardTitle>
                  <Clock className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-500">{stats.pendingDeposits}</div>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-blue-500"
                    onClick={() => setActiveTab('transactions')}
                  >
                    Review deposits →
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-orange-500/20 bg-orange-500/5">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
                  <DollarSign className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-500">{stats.pendingWithdrawals}</div>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-orange-500"
                    onClick={() => setActiveTab('transactions')}
                  >
                    Review withdrawals →
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <ErrorBoundary fallbackTitle="Users section error" fallbackDescription="Failed to load users management.">
            <AdminUsers />
          </ErrorBoundary>
        )}
        {activeTab === 'traders' && (
          <ErrorBoundary fallbackTitle="Traders section error" fallbackDescription="Failed to load traders management.">
            <AdminTraders />
          </ErrorBoundary>
        )}
        {activeTab === 'investment-plans' && (
          <ErrorBoundary fallbackTitle="Investment Plans section error" fallbackDescription="Failed to load investment plans.">
            <AdminInvestmentPlans />
          </ErrorBoundary>
        )}
        {activeTab === 'kyc' && (
          <ErrorBoundary fallbackTitle="KYC section error" fallbackDescription="Failed to load KYC requests.">
            <AdminKYC />
          </ErrorBoundary>
        )}
        {activeTab === 'transactions' && (
          <ErrorBoundary fallbackTitle="Transactions section error" fallbackDescription="Failed to load transactions.">
            <AdminTransactions />
          </ErrorBoundary>
        )}
        {activeTab === 'notifications' && (
          <ErrorBoundary fallbackTitle="Notifications section error" fallbackDescription="Failed to load notifications.">
            <AdminNotifications />
          </ErrorBoundary>
        )}
        {activeTab === 'settings' && (
          <ErrorBoundary fallbackTitle="Settings section error" fallbackDescription="Failed to load settings.">
            <AdminSettings />
          </ErrorBoundary>
        )}
      </main>
    </div>
  );
}
