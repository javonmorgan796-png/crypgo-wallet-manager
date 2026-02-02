import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Pause, RefreshCw, Loader2, Activity, Target, Clock, AlertTriangle } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserWebSocket } from '@/hooks/useUserWebSocket';
import api from '@/services/api';

interface Signal {
  _id: string;
  asset: string;
  type: 'buy' | 'sell' | 'hold';
  entryPrice: number;
  takeProfit?: number;
  stopLoss?: number;
  status: 'active' | 'closed' | 'cancelled';
  result?: 'pending' | 'profit' | 'loss' | 'breakeven';
  notes?: string;
  closedAt?: string;
  closedPrice?: number;
  profitLoss?: number;
  createdAt: string;
}

export default function Signals() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  const fetchSignals = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await api.getSignals(activeTab);
      if (result.success && result.data) {
        setSignals(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch signals:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useUserWebSocket({
    onDataRefresh: (type) => {
      if (type === 'signals') {
        fetchSignals();
      }
    }
  });

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  const activeSignals = signals.filter(s => s.status === 'active');
  const closedSignals = signals.filter(s => s.status === 'closed');

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'buy':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'sell':
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      default:
        return <Pause className="h-5 w-5 text-amber-500" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'buy':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/30">BUY</Badge>;
      case 'sell':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/30">SELL</Badge>;
      default:
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30">HOLD</Badge>;
    }
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'profit':
        return <Badge className="bg-green-500/10 text-green-500">PROFIT</Badge>;
      case 'loss':
        return <Badge className="bg-red-500/10 text-red-500">LOSS</Badge>;
      case 'breakeven':
        return <Badge className="bg-amber-500/10 text-amber-500">BREAKEVEN</Badge>;
      default:
        return <Badge variant="outline">PENDING</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Trading Signals</h1>
            <p className="text-muted-foreground">Expert trading signals from our professional analysts</p>
          </div>
          <Button variant="outline" onClick={fetchSignals} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{activeSignals.length}</p>
                  <p className="text-sm text-muted-foreground">Active Signals</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {closedSignals.filter(s => s.result === 'profit').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Profit Signals</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {closedSignals.filter(s => s.result === 'loss').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Loss Signals</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Target className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {closedSignals.length > 0 
                      ? ((closedSignals.filter(s => s.result === 'profit').length / closedSignals.length) * 100).toFixed(0)
                      : 0}%
                  </p>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="active" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Active Signals
            </TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Signal History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : activeSignals.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="p-12 text-center">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">No Active Signals</h3>
                  <p className="text-muted-foreground">
                    New trading signals will appear here when our analysts publish them
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {activeSignals.map((signal) => (
                  <Card key={signal._id} className="bg-card border-border hover:border-primary/50 transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                            signal.type === 'buy' ? 'bg-green-500/10' : signal.type === 'sell' ? 'bg-red-500/10' : 'bg-amber-500/10'
                          }`}>
                            {getTypeIcon(signal.type)}
                          </div>
                          <div>
                            <h3 className="font-bold text-xl text-foreground">{signal.asset}</h3>
                            <p className="text-sm text-muted-foreground">
                              {new Date(signal.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {getTypeBadge(signal.type)}
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="p-3 rounded-lg bg-secondary/50">
                          <p className="text-xs text-muted-foreground mb-1">Entry Price</p>
                          <p className="font-bold text-foreground">${signal.entryPrice.toLocaleString()}</p>
                        </div>
                        {signal.takeProfit && (
                          <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                            <p className="text-xs text-muted-foreground mb-1">Take Profit</p>
                            <p className="font-bold text-green-500">${signal.takeProfit.toLocaleString()}</p>
                          </div>
                        )}
                        {signal.stopLoss && (
                          <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                            <p className="text-xs text-muted-foreground mb-1">Stop Loss</p>
                            <p className="font-bold text-red-500">${signal.stopLoss.toLocaleString()}</p>
                          </div>
                        )}
                      </div>

                      {signal.notes && (
                        <div className="p-3 rounded-lg bg-secondary/50">
                          <p className="text-sm text-muted-foreground">{signal.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : signals.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="p-12 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">No Signal History</h3>
                  <p className="text-muted-foreground">Your signal history will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {signals.map((signal) => (
                  <Card key={signal._id} className="bg-card border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                            signal.type === 'buy' ? 'bg-green-500/10' : signal.type === 'sell' ? 'bg-red-500/10' : 'bg-amber-500/10'
                          }`}>
                            {getTypeIcon(signal.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-foreground">{signal.asset}</h3>
                              {getTypeBadge(signal.type)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Entry: ${signal.entryPrice.toLocaleString()} • {new Date(signal.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {signal.status === 'closed' ? (
                            <>
                              {getResultBadge(signal.result || 'pending')}
                              {signal.profitLoss !== undefined && (
                                <p className={`text-sm mt-1 ${signal.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  {signal.profitLoss >= 0 ? '+' : ''}{signal.profitLoss.toFixed(2)}%
                                </p>
                              )}
                            </>
                          ) : (
                            <Badge variant="outline" className="border-primary text-primary">ACTIVE</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Disclaimer */}
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-600 mb-1">Trading Risk Disclaimer</h4>
                <p className="text-sm text-muted-foreground">
                  Trading signals are for informational purposes only and should not be considered financial advice. 
                  Always do your own research and trade responsibly. Past performance does not guarantee future results.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
