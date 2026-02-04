import { useState, useEffect, useCallback } from 'react';
import { Users, TrendingUp, Target, Shield, Search, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { FeedbackDialog } from '@/components/ui/success-dialog';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useUserWebSocket } from '@/hooks/useUserWebSocket';

interface Trader {
  _id: string;
  name: string;
  avatar: string;
  winRate: number;
  totalProfit: number;
  profitPercentage: number;
  followers: number;
  trades: number;
  riskLevel: 'low' | 'medium' | 'high';
  specialization: string;
  monthlyReturns: number[];
  minCopyAmount: number;
  maxCopyAmount: number;
}

interface CopyTradeType {
  _id: string;
  trader: Trader;
  amount: number;
  currentValue: number;
  profit: number;
  profitPercentage: number;
  status: 'active' | 'paused' | 'stopped';
  startDate: string;
  settings: {
    stopLoss: number;
    takeProfit: number;
    copyPercentage: number;
  };
}

interface FeedbackState {
  open: boolean;
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
}

export default function CopyTrade() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrader, setSelectedTrader] = useState<Trader | null>(null);
  const [copyAmount, setCopyAmount] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [traders, setTraders] = useState<Trader[]>([]);
  const [myCopies, setMyCopies] = useState<CopyTradeType[]>([]);
  const [isLoadingTraders, setIsLoadingTraders] = useState(true);
  const [isLoadingCopies, setIsLoadingCopies] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stopLoss, setStopLoss] = useState([20]);
  const [takeProfit, setTakeProfit] = useState([50]);
  const [feedback, setFeedback] = useState<FeedbackState>({
    open: false,
    type: 'success',
    title: '',
    message: ''
  });
  const { user, refreshUser } = useAuth();

  const fetchTraders = useCallback(async () => {
    setIsLoadingTraders(true);
    try {
      const result = await api.getTraders();
      if (result.success && result.data) {
        setTraders(result.data);
      } else {
        setTraders([]);
      }
    } catch (error) {
      console.error('Failed to fetch traders:', error);
      setTraders([]);
    } finally {
      setIsLoadingTraders(false);
    }
  }, []);

  const fetchMyCopies = useCallback(async () => {
    setIsLoadingCopies(true);
    try {
      const result = await api.getMyCopyTrades();
      if (result.success && result.data) {
        setMyCopies(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch copy trades:', error);
    } finally {
      setIsLoadingCopies(false);
    }
  }, []);

  // WebSocket for real-time trader updates
  useUserWebSocket({
    onTradersUpdate: (updatedTraders) => {
      setTraders(updatedTraders);
    },
    onDataRefresh: (type) => {
      if (type === 'traders') {
        fetchTraders();
      }
    }
  });

  useEffect(() => {
    fetchTraders();
    fetchMyCopies();
  }, [fetchTraders, fetchMyCopies]);

  const filteredTraders = traders.filter(
    (trader) =>
      trader.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trader.specialization.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showFeedback = (type: 'success' | 'error' | 'warning', title: string, message: string) => {
    setFeedback({ open: true, type, title, message });
  };

  const handleCopyTrader = async () => {
    if (!selectedTrader || !copyAmount) {
      showFeedback('error', 'Missing Information', 'Please enter a copy amount.');
      return;
    }

    const amount = parseFloat(copyAmount);
    if (isNaN(amount) || amount <= 0) {
      showFeedback('error', 'Invalid Amount', 'Please enter a valid copy amount.');
      return;
    }

    if (amount < (selectedTrader.minCopyAmount || 100)) {
      showFeedback('error', 'Amount Too Low', `Minimum copy amount is $${selectedTrader.minCopyAmount || 100}`);
      return;
    }

    if (user && amount > user.balance) {
      showFeedback('error', 'Insufficient Balance', 'You don\'t have enough balance to copy this trader.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await api.startCopyTrade(selectedTrader._id, amount, {
        stopLoss: stopLoss[0],
        takeProfit: takeProfit[0],
        copyPercentage: 100,
      });

      if (result.success) {
        setDialogOpen(false);
        setCopyAmount('');
        const traderName = selectedTrader.name;
        setSelectedTrader(null);
        setStopLoss([20]);
        setTakeProfit([50]);
        fetchMyCopies();
        refreshUser();
        showFeedback(
          'success',
          'Copy Trade Started!',
          `You are now copying ${traderName} with $${amount.toLocaleString()}. Your trades will mirror theirs automatically.`
        );
      } else {
        showFeedback('error', 'Copy Trade Failed', result.error || 'Failed to start copy trade. Please try again.');
      }
    } catch (error: any) {
      console.error('Copy trade error:', error);
      showFeedback('error', 'Connection Error', 'Failed to connect to the server. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStopCopy = async (copyId: string) => {
    try {
      const result = await api.stopCopyTrade(copyId);
      if (result.success) {
        const data = result.data as { returnAmount?: number; profit?: number; profitPercentage?: number } | undefined;
        fetchMyCopies();
        refreshUser();
        
        if (data?.profit !== undefined) {
          const profitText = data.profit >= 0 ? `+$${data.profit.toFixed(2)}` : `-$${Math.abs(data.profit).toFixed(2)}`;
          showFeedback(
            data.profit >= 0 ? 'success' : 'warning',
            'Copy Trade Closed',
            `$${data.returnAmount?.toFixed(2)} has been returned to your balance. Total ${data.profit >= 0 ? 'profit' : 'loss'}: ${profitText}`
          );
        } else {
          showFeedback('success', 'Copy Trade Stopped', 'Your funds have been returned to your balance.');
        }
      } else {
        showFeedback('error', 'Failed to Stop', result.error || 'Failed to stop copy trade. Please try again.');
      }
    } catch (error: any) {
      console.error('Stop copy trade error:', error);
      showFeedback('error', 'Connection Error', 'Failed to connect to the server. Please try again.');
    }
  };

  const openCopyDialog = (trader: Trader) => {
    setSelectedTrader(trader);
    setDialogOpen(true);
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'bg-green-500/10 text-green-500 border-green-500/30';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
      case 'high':
        return 'bg-red-500/10 text-red-500 border-red-500/30';
      default:
        return '';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Copy Trading</h1>
            <p className="text-muted-foreground">Follow professional traders and copy their strategies</p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search traders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary border-border"
            />
          </div>
        </div>

        <Tabs defaultValue="traders" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="traders" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Professional Traders
            </TabsTrigger>
            <TabsTrigger value="my-copies" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              My Copy Trades
            </TabsTrigger>
          </TabsList>

          {/* Professional Traders */}
          <TabsContent value="traders" className="space-y-6">
            {isLoadingTraders ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="bg-card border-border">
                    <CardContent className="p-6">
                      {/* Header Skeleton */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-14 w-14 rounded-full bg-muted animate-pulse" />
                          <div>
                            <div className="h-5 w-32 bg-muted animate-pulse rounded mb-1" />
                            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                          </div>
                        </div>
                        <div className="h-6 w-20 bg-muted animate-pulse rounded-full" />
                      </div>
                      {/* Stats Skeleton */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        {[1, 2, 3, 4].map((j) => (
                          <div key={j} className="p-3 rounded-lg bg-secondary/50">
                            <div className="h-4 w-16 bg-muted animate-pulse rounded mb-1" />
                            <div className="h-5 w-12 bg-muted animate-pulse rounded" />
                          </div>
                        ))}
                      </div>
                      {/* Performance Skeleton */}
                      <div className="mb-4">
                        <div className="h-4 w-40 bg-muted animate-pulse rounded mb-2" />
                        <div className="flex items-end gap-1 h-12">
                          {[1, 2, 3, 4, 5, 6].map((j) => (
                            <div key={j} className="flex-1 bg-muted animate-pulse rounded-t" style={{ height: `${30 + Math.random() * 40}%` }} />
                          ))}
                        </div>
                      </div>
                      <div className="h-12 w-full bg-muted animate-pulse rounded-lg mb-4" />
                      <div className="h-10 w-full bg-muted animate-pulse rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredTraders.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredTraders.map((trader) => (
                  <Card
                    key={trader._id}
                    className="bg-card border-border hover:border-primary/50 transition-all duration-300 hover-lift"
                  >
                    <CardContent className="p-6">
                      {/* Trader Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={trader.avatar}
                            alt={trader.name}
                            className="h-14 w-14 rounded-full border-2 border-primary"
                          />
                          <div>
                            <h3 className="font-semibold text-foreground">{trader.name}</h3>
                            <p className="text-sm text-muted-foreground">{trader.specialization}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={getRiskColor(trader.riskLevel)}>
                          {trader.riskLevel} risk
                        </Badge>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="p-3 rounded-lg bg-secondary/50">
                          <div className="flex items-center gap-2 mb-1">
                            <Target className="h-4 w-4 text-primary" />
                            <span className="text-xs text-muted-foreground">Win Rate</span>
                          </div>
                          <p className="font-bold text-foreground">{trader.winRate}%</p>
                        </div>
                        <div className="p-3 rounded-lg bg-secondary/50">
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            <span className="text-xs text-muted-foreground">Total Return</span>
                          </div>
                          <p className="font-bold text-primary">+{trader.profitPercentage}%</p>
                        </div>
                        <div className="p-3 rounded-lg bg-secondary/50">
                          <div className="flex items-center gap-2 mb-1">
                            <Users className="h-4 w-4 text-primary" />
                            <span className="text-xs text-muted-foreground">Followers</span>
                          </div>
                          <p className="font-bold text-foreground">{trader.followers.toLocaleString()}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-secondary/50">
                          <div className="flex items-center gap-2 mb-1">
                            <Shield className="h-4 w-4 text-primary" />
                            <span className="text-xs text-muted-foreground">Trades</span>
                          </div>
                          <p className="font-bold text-foreground">{trader.trades.toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Monthly Performance */}
                      <div className="mb-4">
                        <p className="text-xs text-muted-foreground mb-2">Last 6 months performance</p>
                        <div className="flex items-end gap-1 h-12">
                          {trader.monthlyReturns.map((value, index) => (
                            <div
                              key={index}
                              className={`flex-1 rounded-t ${value >= 0 ? 'bg-primary' : 'bg-destructive'}`}
                              style={{
                                height: `${Math.min(Math.abs(value) * 2, 100)}%`,
                                minHeight: '4px',
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Total Profit */}
                      <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <span className="text-sm text-muted-foreground">Total Profit Generated</span>
                        <span className="font-bold text-primary">
                          ${(trader.totalProfit / 1000000).toFixed(2)}M
                        </span>
                      </div>

                      <Button
                        onClick={() => openCopyDialog(trader)}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Copy Trader
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="p-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">No professional traders available</h3>
                  <p className="text-muted-foreground">
                    Professional traders will appear here once they are added by the admin
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* My Copy Trades */}
          <TabsContent value="my-copies" className="space-y-4">
            {isLoadingCopies ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : myCopies.length > 0 ? (
              myCopies.map((copy) => (
                <Card key={copy._id} className="bg-card border-border">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={copy.trader?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${copy.trader?.name}`}
                          alt={copy.trader?.name}
                          className="h-14 w-14 rounded-full border-2 border-primary"
                        />
                        <div>
                          <h3 className="font-semibold text-foreground">{copy.trader?.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Started: {new Date(copy.startDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                          <p className="text-sm text-muted-foreground">Invested</p>
                          <p className="font-semibold text-foreground">
                            ${copy.amount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Current Value</p>
                          <p className="font-semibold text-foreground">
                            ${copy.currentValue?.toFixed(2) || copy.amount.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Profit</p>
                          <p className={`font-semibold ${copy.profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                            {copy.profit >= 0 ? '+' : ''}${copy.profit?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Status</p>
                          <Badge
                            variant="outline"
                            className={
                              copy.status === 'active'
                                ? 'bg-primary/10 text-primary border-primary/30'
                                : 'bg-muted text-muted-foreground'
                            }
                          >
                            {copy.status}
                          </Badge>
                        </div>
                      </div>
                      {copy.status === 'active' && (
                        <Button
                          variant="outline"
                          className="border-destructive text-destructive hover:bg-destructive/10"
                          onClick={() => handleStopCopy(copy._id)}
                        >
                          Stop Copy
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="p-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">No active copy trades</h3>
                  <p className="text-muted-foreground mb-4">
                    Start copying a professional trader to see your trades here
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Copy Trader Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">
                Copy {selectedTrader?.name}
              </DialogTitle>
              <DialogDescription>
                Enter the amount you want to allocate for copying this trader's strategies.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              {selectedTrader && (
                <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50">
                  <img
                    src={selectedTrader.avatar}
                    alt={selectedTrader.name}
                    className="h-12 w-12 rounded-full border-2 border-primary"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{selectedTrader.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedTrader.specialization}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">+{selectedTrader.profitPercentage}%</p>
                    <p className="text-xs text-muted-foreground">Total Return</p>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="copy-amount">Copy Amount (USD)</Label>
                <Input
                  id="copy-amount"
                  type="number"
                  placeholder={`Minimum: $${selectedTrader?.minCopyAmount || 100}`}
                  value={copyAmount}
                  onChange={(e) => setCopyAmount(e.target.value)}
                  className="bg-secondary border-border"
                />
                <p className="text-sm text-muted-foreground">
                  Available balance: ${user?.balance?.toFixed(2) || '0.00'}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Stop Loss: {stopLoss[0]}%</Label>
                  <Slider
                    value={stopLoss}
                    onValueChange={setStopLoss}
                    min={5}
                    max={50}
                    step={5}
                    className="py-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Automatically stop if loss exceeds this percentage
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Take Profit: {takeProfit[0]}%</Label>
                  <Slider
                    value={takeProfit}
                    onValueChange={setTakeProfit}
                    min={10}
                    max={200}
                    step={10}
                    className="py-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Automatically close when profit reaches this percentage
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="flex-1 border-border"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCopyTrader}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={!copyAmount || parseFloat(copyAmount) < (selectedTrader?.minCopyAmount || 100) || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    'Start Copying'
                  )}
                </Button>
              </div>
          </div>
          </DialogContent>
        </Dialog>

        {/* Feedback Dialog */}
        <FeedbackDialog
          open={feedback.open}
          onOpenChange={(open) => setFeedback(prev => ({ ...prev, open }))}
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          actionLabel={feedback.type === 'success' ? 'Great!' : 'Got it'}
        />
      </div>
    </DashboardLayout>
  );
}
