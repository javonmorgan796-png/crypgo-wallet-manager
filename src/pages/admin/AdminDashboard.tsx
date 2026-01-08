import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  DollarSign, 
  FileCheck, 
  Bell, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  CheckCircle,
  XCircle,
  LogOut,
  LayoutDashboard,
  UserCheck,
  Receipt,
  MessageSquare,
  Settings
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo.png';

// Import admin sub-components
import { AdminUsers } from './AdminUsers';
import { AdminKYC } from './AdminKYC';
import { AdminTransactions } from './AdminTransactions';
import { AdminNotifications } from './AdminNotifications';
import { AdminSettings } from './AdminSettings';

export default function AdminDashboard() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalUsers: 1250,
    activeUsers: 890,
    pendingKYC: 45,
    pendingDeposits: 12,
    pendingWithdrawals: 8,
    totalDeposits: 2450000,
    totalWithdrawals: 1850000,
  });

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAdmin) {
    return null;
  }

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'kyc', label: 'KYC Requests', icon: UserCheck },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'notifications', label: 'Notifications', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border p-4 flex flex-col">
        <div className="flex items-center gap-3 mb-8 px-2">
          <img src={logo} alt="Green Bull" className="h-10 w-10" />
          <div>
            <h1 className="font-bold text-lg">Green Bull</h1>
            <p className="text-xs text-muted-foreground">Admin Panel</p>
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
      <main className="flex-1 p-8 overflow-auto">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold">Dashboard Overview</h2>
              <p className="text-muted-foreground">Welcome back, {user?.name}</p>
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
                  <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-500">+12%</span> from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Users
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeUsers.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    {((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}% of total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Deposits
                  </CardTitle>
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${stats.totalDeposits.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-500">+8.2%</span> from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Withdrawals
                  </CardTitle>
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${stats.totalWithdrawals.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-red-500">+5.1%</span> from last month
                  </p>
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

        {activeTab === 'users' && <AdminUsers />}
        {activeTab === 'kyc' && <AdminKYC />}
        {activeTab === 'transactions' && <AdminTransactions />}
        {activeTab === 'notifications' && <AdminNotifications />}
        {activeTab === 'settings' && <AdminSettings />}
      </main>
    </div>
  );
}
