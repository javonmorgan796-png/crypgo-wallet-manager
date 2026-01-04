import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Download, Filter, Search } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { mockTransactions } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';

export default function Transactions() {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const filteredTransactions = mockTransactions.filter((transaction) => {
    const matchesType = filterType === 'all' || transaction.type === filterType;
    const matchesSearch =
      transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.reference?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleExport = () => {
    toast({
      title: 'Export started',
      description: 'Your transaction history will be downloaded shortly.',
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'bg-green-500/10 text-green-500 border-green-500/30';
      case 'withdrawal':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
      case 'investment':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      case 'profit':
        return 'bg-primary/10 text-primary border-primary/30';
      case 'copy-trade':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-primary';
      case 'pending':
        return 'text-warning';
      case 'failed':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  // Calculate totals
  const totals = {
    deposits: mockTransactions
      .filter((t) => t.type === 'deposit' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0),
    withdrawals: Math.abs(
      mockTransactions
        .filter((t) => t.type === 'withdrawal' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0)
    ),
    profits: mockTransactions
      .filter((t) => t.type === 'profit' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0),
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Transactions</h1>
            <p className="text-muted-foreground">View and manage your transaction history</p>
          </div>
          <Button
            variant="outline"
            onClick={handleExport}
            className="border-border text-foreground hover:bg-secondary"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <ArrowDownRight className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Deposits</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${totals.deposits.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <ArrowUpRight className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Withdrawals</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${totals.withdrawals.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ArrowDownRight className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Profits</p>
                  <p className="text-2xl font-bold text-primary">
                    +${totals.profits.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by description or reference..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-secondary border-border"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full md:w-48 bg-secondary border-border">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="deposit">Deposits</SelectItem>
                  <SelectItem value="withdrawal">Withdrawals</SelectItem>
                  <SelectItem value="investment">Investments</SelectItem>
                  <SelectItem value="profit">Profits</SelectItem>
                  <SelectItem value="copy-trade">Copy Trades</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-display text-xl">Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex flex-col md:flex-row md:items-center justify-between py-4 px-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-12 w-12 rounded-full flex items-center justify-center ${
                          transaction.amount >= 0
                            ? 'bg-primary/10 text-primary'
                            : 'bg-orange-500/10 text-orange-500'
                        }`}
                      >
                        {transaction.amount >= 0 ? (
                          <ArrowDownRight className="h-6 w-6" />
                        ) : (
                          <ArrowUpRight className="h-6 w-6" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 md:gap-6">
                      <Badge variant="outline" className={getTypeColor(transaction.type)}>
                        {transaction.type.replace('-', ' ')}
                      </Badge>
                      <div className="text-right">
                        <p
                          className={`font-semibold ${
                            transaction.amount >= 0 ? 'text-primary' : 'text-foreground'
                          }`}
                        >
                          {transaction.amount >= 0 ? '+' : ''}$
                          {Math.abs(transaction.amount).toLocaleString()}
                        </p>
                        <p className={`text-xs capitalize ${getStatusColor(transaction.status)}`}>
                          {transaction.status}
                        </p>
                      </div>
                      {transaction.reference && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {transaction.reference}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No transactions found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}