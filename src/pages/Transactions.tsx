import { useState, useEffect, useCallback } from 'react';
import { ArrowUpRight, ArrowDownRight, Download, Filter, Search, Calendar, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';

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

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const { toast } = useToast();

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: any = {};
      if (filterType !== 'all') filters.type = filterType;
      if (filterStatus !== 'all') filters.status = filterStatus;
      if (dateFrom) filters.dateFrom = dateFrom.toISOString();
      if (dateTo) filters.dateTo = dateTo.toISOString();

      const result = await api.getTransactions(filters);
      console.log('Transactions API result:', result);
      
      if (result.success && result.data) {
        // Handle both array and paginated response formats
        const txData = Array.isArray(result.data) 
          ? result.data 
          : (result.data as any).transactions || result.data || [];
        
        const mappedTransactions = (Array.isArray(txData) ? txData : []).map((tx: any) => ({
          id: tx._id || tx.id,
          userId: tx.user || tx.userId,
          type: tx.type,
          amount: tx.amount,
          status: tx.status,
          description: tx.description || tx.notes || `${tx.type?.charAt(0).toUpperCase() + tx.type?.slice(1)} - ${tx.method || 'crypto'}`,
          createdAt: tx.createdAt,
          reference: tx.txHash || tx.externalRef || tx._id,
        }));
        
        console.log('Mapped transactions:', mappedTransactions.length);
        setTransactions(mappedTransactions);
      } else {
        console.error('Failed to fetch transactions:', result.error);
        setTransactions([]);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load transactions',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [filterType, filterStatus, dateFrom, dateTo, toast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.reference?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleExport = () => {
    if (transactions.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There are no transactions to export.',
      });
      return;
    }

    // Create CSV content
    const headers = ['Date', 'Type', 'Description', 'Amount', 'Status', 'Reference'];
    const rows = transactions.map(t => [
      new Date(t.createdAt).toLocaleString(),
      t.type,
      t.description,
      t.amount.toString(),
      t.status,
      t.reference || ''
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Export complete',
      description: 'Your transaction history has been downloaded.',
    });
  };

  const clearFilters = () => {
    setFilterType('all');
    setFilterStatus('all');
    setSearchQuery('');
    setDateFrom(undefined);
    setDateTo(undefined);
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
      case 'referral':
        return 'bg-pink-500/10 text-pink-500 border-pink-500/30';
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

  // Calculate totals from real data
  const totals = {
    deposits: transactions
      .filter((t) => t.type === 'deposit' && t.status === 'completed')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0),
    withdrawals: transactions
      .filter((t) => t.type === 'withdrawal' && t.status === 'completed')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0),
    profits: transactions
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
                    ${totals.deposits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    ${totals.withdrawals.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    +${totals.profits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Filters */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
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
                  <SelectTrigger className="w-full md:w-40 bg-secondary border-border">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="deposit">Deposits</SelectItem>
                    <SelectItem value="withdrawal">Withdrawals</SelectItem>
                    <SelectItem value="investment">Investments</SelectItem>
                    <SelectItem value="profit">Profits</SelectItem>
                    <SelectItem value="copy-trade">Copy Trades</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full md:w-40 bg-secondary border-border">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div className="flex gap-2 items-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="bg-secondary border-border">
                        <Calendar className="h-4 w-4 mr-2" />
                        {dateFrom ? format(dateFrom, 'PP') : 'From Date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground">to</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="bg-secondary border-border">
                        <Calendar className="h-4 w-4 mr-2" />
                        {dateTo ? format(dateTo, 'PP') : 'To Date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {(filterType !== 'all' || filterStatus !== 'all' || searchQuery || dateFrom || dateTo) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-display text-xl">
              Transaction History
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({filteredTransactions.length} transactions)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
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
                        <Badge variant="outline" className={`capitalize ${getStatusColor(transaction.status)} border-current/30 bg-current/10`}>
                          {transaction.status}
                        </Badge>
                        <div className="text-right min-w-[100px]">
                          <p
                            className={`font-semibold ${
                              transaction.amount >= 0 ? 'text-primary' : 'text-foreground'
                            }`}
                          >
                            {transaction.amount >= 0 ? '+' : ''}$
                            {Math.abs(transaction.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
