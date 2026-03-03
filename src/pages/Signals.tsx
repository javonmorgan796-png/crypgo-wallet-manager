import { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, TrendingDown, Pause, RefreshCw, Loader2, Activity, Target, 
  Clock, AlertTriangle, Lock, Zap, Shield, Crown, CheckCircle, Upload
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUserWebSocket } from '@/hooks/useUserWebSocket';
import { useToast } from '@/hooks/use-toast';
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

interface SignalPlan {
  id: string;
  label: string;
  price: number;
  duration: number;
}

export default function Signals() {
  const { toast } = useToast();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [plans, setPlans] = useState<SignalPlan[]>([]);
  const [showSubscribeDialog, setShowSubscribeDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const checkAccess = useCallback(async () => {
    try {
      const result = await api.getSignalSubscription();
      if (result.success && result.data) {
        setHasAccess(result.data.hasAccess);
        setSubscription(result.data.subscription);
      }
    } catch {
      setHasAccess(false);
    }
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      const result = await api.getSignalPlans();
      if (result.success && result.data) {
        setPlans(result.data);
      }
    } catch {}
  }, []);

  const fetchSignals = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await api.getSignals(activeTab);
      if (result.success && result.data) {
        setSignals(result.data);
      } else {
        // If 403, no access
        setSignals([]);
      }
    } catch {
      setSignals([]);
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
    checkAccess();
    fetchPlans();
  }, [checkAccess, fetchPlans]);

  useEffect(() => {
    if (hasAccess) {
      fetchSignals();
    } else {
      setIsLoading(false);
    }
  }, [hasAccess, fetchSignals]);

  const handleSubscribe = async () => {
    if (!selectedPlan) {
      toast({ title: 'Select a plan', variant: 'destructive' });
      return;
    }
    setIsSubscribing(true);
    try {
      const result = await api.subscribeToSignals(selectedPlan, receipt || undefined);
      if (result.success) {
        toast({ title: 'Subscription submitted!', description: 'Awaiting admin approval. You will be notified once approved.' });
        setShowSubscribeDialog(false);
        setSelectedPlan('');
        setReceipt(null);
        checkAccess();
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to subscribe', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to subscribe', variant: 'destructive' });
    } finally {
      setIsSubscribing(false);
    }
  };

  const activeSignals = signals.filter(s => s.status === 'active');
  const closedSignals = signals.filter(s => s.status === 'closed');

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'buy': return <TrendingUp className="h-5 w-5 text-emerald-400" />;
      case 'sell': return <TrendingDown className="h-5 w-5 text-red-400" />;
      default: return <Pause className="h-5 w-5 text-amber-400" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'buy': return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-semibold">BUY</Badge>;
      case 'sell': return <Badge className="bg-red-500/15 text-red-400 border-red-500/30 font-semibold">SELL</Badge>;
      default: return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 font-semibold">HOLD</Badge>;
    }
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'profit': return <Badge className="bg-emerald-500/15 text-emerald-400">PROFIT</Badge>;
      case 'loss': return <Badge className="bg-red-500/15 text-red-400">LOSS</Badge>;
      case 'breakeven': return <Badge className="bg-amber-500/15 text-amber-400">BREAKEVEN</Badge>;
      default: return <Badge variant="outline">PENDING</Badge>;
    }
  };

  // === PAYWALL: No subscription ===
  if (hasAccess === false) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900/40 via-background to-background border border-emerald-500/20 p-8 md:p-12">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-6 w-6 text-emerald-400" />
                <span className="text-emerald-400 font-semibold text-sm uppercase tracking-wider">Premium Signals</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                Expert Trading Signals
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mb-6">
                Get real-time buy/sell signals from our professional analysts. Subscribe to unlock premium trading insights and boost your portfolio.
              </p>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span>Real-time signals</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span>Entry, TP & SL levels</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span>Expert analysis notes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Plans */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-400" />
              Choose Your Plan
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan) => {
                const isPopular = plan.id === '3_months';
                return (
                  <Card 
                    key={plan.id} 
                    className={`relative bg-card border transition-all hover:scale-[1.02] cursor-pointer ${
                      isPopular ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : 'border-border hover:border-primary/30'
                    }`}
                    onClick={() => {
                      setSelectedPlan(plan.id);
                      setShowSubscribeDialog(true);
                    }}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-emerald-500 text-white text-xs">Most Popular</Badge>
                      </div>
                    )}
                    <CardContent className="p-6 text-center">
                      <h3 className="font-semibold text-foreground text-lg mb-2">{plan.label}</h3>
                      <div className="mb-4">
                        <span className="text-3xl font-bold text-foreground">${plan.price}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">{plan.duration} days access</p>
                      <Button 
                        className={`w-full ${isPopular ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                        variant={isPopular ? 'default' : 'outline'}
                      >
                        Subscribe
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Locked Preview */}
          <Card className="bg-card/50 border-border relative overflow-hidden">
            <div className="absolute inset-0 backdrop-blur-md bg-background/60 z-10 flex flex-col items-center justify-center">
              <Lock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Content Locked</h3>
              <p className="text-muted-foreground text-sm mb-4">Subscribe to view trading signals</p>
              <Button onClick={() => setShowSubscribeDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <Zap className="h-4 w-4 mr-2" />
                Unlock Signals
              </Button>
            </div>
            <CardContent className="p-6 opacity-30">
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-40 rounded-xl bg-secondary/50" />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Subscribe Dialog */}
          <Dialog open={showSubscribeDialog} onOpenChange={setShowSubscribeDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Subscribe to Signals</DialogTitle>
                <DialogDescription>
                  Select a plan and upload payment receipt to get access.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label} — ${p.price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Payment Receipt</Label>
                  <div 
                    className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => document.getElementById('receipt-upload')?.click()}
                  >
                    {receipt ? (
                      <div className="flex items-center justify-center gap-2 text-emerald-400">
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-sm">{receipt.name}</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Click to upload receipt</p>
                      </>
                    )}
                  </div>
                  <input 
                    id="receipt-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSubscribeDialog(false)}>Cancel</Button>
                <Button onClick={handleSubscribe} disabled={isSubscribing} className="bg-emerald-600 hover:bg-emerald-700">
                  {isSubscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Payment'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    );
  }

  // === Loading state ===
  if (hasAccess === null) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // === SUBSCRIBED: Full signal page ===
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
              Trading Signals
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                <Shield className="h-3 w-3 mr-1" />
                Premium
              </Badge>
            </h1>
            <p className="text-muted-foreground mt-1">Expert trading signals from our professional analysts</p>
          </div>
          <Button variant="outline" onClick={fetchSignals} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Subscription Info */}
        {subscription && (
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Crown className="h-5 w-5 text-amber-400" />
                <div>
                  <p className="text-sm font-medium text-foreground">Active Subscription</p>
                  <p className="text-xs text-muted-foreground">
                    Expires: {new Date(subscription.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">Active</Badge>
            </CardContent>
          </Card>
        )}

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
                  <p className="text-xs text-muted-foreground">Active Signals</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {closedSignals.filter(s => s.result === 'profit').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Profit Signals</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {closedSignals.filter(s => s.result === 'loss').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Loss Signals</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Target className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {closedSignals.length > 0 
                      ? ((closedSignals.filter(s => s.result === 'profit').length / closedSignals.length) * 100).toFixed(0)
                      : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Win Rate</p>
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
                  <Card key={signal._id} className="bg-card border-border hover:border-primary/40 transition-all group">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                            signal.type === 'buy' ? 'bg-emerald-500/10' : signal.type === 'sell' ? 'bg-red-500/10' : 'bg-amber-500/10'
                          }`}>
                            {getTypeIcon(signal.type)}
                          </div>
                          <div>
                            <h3 className="font-bold text-xl text-foreground">{signal.asset}</h3>
                            <p className="text-xs text-muted-foreground">
                              {new Date(signal.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {getTypeBadge(signal.type)}
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="p-3 rounded-lg bg-secondary/50">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Entry</p>
                          <p className="font-bold text-foreground text-sm">${signal.entryPrice.toLocaleString()}</p>
                        </div>
                        {signal.takeProfit && (
                          <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Take Profit</p>
                            <p className="font-bold text-emerald-400 text-sm">${signal.takeProfit.toLocaleString()}</p>
                          </div>
                        )}
                        {signal.stopLoss && (
                          <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Stop Loss</p>
                            <p className="font-bold text-red-400 text-sm">${signal.stopLoss.toLocaleString()}</p>
                          </div>
                        )}
                      </div>

                      {signal.notes && (
                        <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                          <p className="text-sm text-muted-foreground leading-relaxed">{signal.notes}</p>
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
                  <Card key={signal._id} className="bg-card border-border hover:border-border/80 transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                            signal.type === 'buy' ? 'bg-emerald-500/10' : signal.type === 'sell' ? 'bg-red-500/10' : 'bg-amber-500/10'
                          }`}>
                            {getTypeIcon(signal.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-foreground">{signal.asset}</h3>
                              {getTypeBadge(signal.type)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Entry: ${signal.entryPrice.toLocaleString()} • {new Date(signal.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {signal.status === 'closed' ? (
                            <>
                              {getResultBadge(signal.result || 'pending')}
                              {signal.profitLoss !== undefined && (
                                <p className={`text-sm mt-1 font-medium ${signal.profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
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
