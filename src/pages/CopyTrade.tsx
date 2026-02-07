import { useState, useEffect, useCallback } from 'react';
import { Users, TrendingUp, Star, Search, Loader2, Flame } from 'lucide-react';
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
  copierCount: number;
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

  // Derive badges from trader data
  const getTraderBadges = (trader: Trader) => {
    const badges: { label: string; color: string }[] = [];
    if (trader.riskLevel === 'low') badges.push({ label: 'Low Leverage', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' });
    if (trader.riskLevel === 'high') badges.push({ label: 'High Risk', color: 'bg-red-500/20 text-red-400 border-red-500/30' });
    if (trader.winRate >= 90) badges.push({ label: 'Win Streak', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' });
    if (trader.profitPercentage >= 50) badges.push({ label: 'Top Profit', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' });
    if (trader.specialization) badges.push({ label: trader.specialization, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' });
    return badges.slice(0, 2);
  };

  // Check if trader is "full" (many copiers)
  const isTraderFull = (trader: Trader) => {
    return (trader.copierCount || 0) >= 50;
  };

  const formatProfitValue = (value: number) => {
    if (value >= 0) return `+${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

          {/* Professional Traders - New card layout matching reference */}
          <TabsContent value="traders" className="space-y-4">
            {isLoadingTraders ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-12 w-12 rounded-full bg-muted" />
                      <div className="flex-1">
                        <div className="h-5 w-32 bg-muted rounded mb-1" />
                        <div className="flex gap-2">
                          <div className="h-5 w-20 bg-muted rounded-full" />
                          <div className="h-5 w-20 bg-muted rounded-full" />
                        </div>
                      </div>
                      <div className="h-9 w-20 bg-muted rounded-full" />
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      {[1,2,3].map(j => (
                        <div key={j}>
                          <div className="h-3 w-20 bg-muted rounded mb-2" />
                          <div className="h-5 w-16 bg-muted rounded" />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {[1,2,3].map(j => (
                        <div key={j}>
                          <div className="h-3 w-20 bg-muted rounded mb-2" />
                          <div className="h-5 w-16 bg-muted rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredTraders.length > 0 ? (
              <div className="space-y-4">
                {filteredTraders.map((trader) => {
                  const badges = getTraderBadges(trader);
                  const full = isTraderFull(trader);
                  const roi = trader.profitPercentage || 0;
                  const drawdown = Math.min(Math.abs(trader.monthlyReturns?.reduce((min, v) => Math.min(min, v), 0) || 0), 99);
                  const followersProfit = trader.totalProfit || 0;
                  const winRate = trader.winRate || 0;
                  const profitLossRatio = winRate > 0 ? ((winRate / (100 - winRate)) * 10).toFixed(2) : '0.00';
                  const sharpeRatio = roi > 0 ? (roi / (drawdown || 1) * 0.1).toFixed(2) : '--';

                  return (
                    <div
                      key={trader._id}
                      className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all duration-300"
                    >
                      {/* Header: Avatar, Name, Badges, Star, Copy/Full button */}
                      <div className="flex items-center gap-3 mb-5">
                        <img
                          src={trader.avatar}
                          alt={trader.name}
                          className="h-12 w-12 rounded-full border-2 border-border object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-foreground text-lg truncate">{trader.name}</h3>
                            <span className="text-lg">🤝</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {badges.map((badge, idx) => (
                              <span key={idx} className={`text-xs px-2 py-0.5 rounded-full border ${badge.color}`}>
                                {badge.label}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Star className="h-5 w-5 text-muted-foreground hover:text-amber-400 cursor-pointer transition-colors" />
                          {full ? (
                            <span className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold">
                              <Flame className="h-4 w-4" />
                              Full
                            </span>
                          ) : (
                            <Button
                              onClick={() => openCopyDialog(trader)}
                              className="rounded-full px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 font-semibold text-sm border-0"
                            >
                              Copy
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Stats Row 1 */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">7D ROI</p>
                          <p className={`font-bold text-base ${roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">7D Max. Drawdown</p>
                          <p className={`font-bold text-base ${drawdown > 0 ? 'text-emerald-400' : 'text-foreground'}`}>
                            {drawdown > 0 ? '+' : ''}{drawdown.toFixed(2)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">7D Followers' P&L</p>
                          <p className={`font-bold text-base ${followersProfit >= 0 ? 'text-foreground' : 'text-red-400'}`}>
                            {formatProfitValue(followersProfit)}
                          </p>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-border mb-4" />

                      {/* Stats Row 2 */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">7D Win Rate</p>
                          <p className={`font-bold text-base ${winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                            +{winRate.toFixed(2)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">7D Profit-to-Loss Ratio</p>
                          <p className="font-bold text-base text-foreground">
                            {profitLossRatio} : 0
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">7D Sharpe Ratio</p>
                          <p className={`font-bold text-base ${sharpeRatio !== '--' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {sharpeRatio !== '--' ? `+${sharpeRatio}` : '--'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                <div key={copy._id} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src={copy.trader?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${copy.trader?.name}`}
                      alt={copy.trader?.name}
                      className="h-12 w-12 rounded-full border-2 border-border object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground text-lg truncate">{copy.trader?.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        Started: {new Date(copy.startDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        copy.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-muted text-muted-foreground'
                      }
                    >
                      {copy.status}
                    </Badge>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Invested</p>
                      <p className="font-bold text-foreground">${copy.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Current Value</p>
                      <p className="font-bold text-foreground">${copy.currentValue?.toFixed(2) || copy.amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Profit</p>
                      <p className={`font-bold ${copy.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {copy.profit >= 0 ? '+' : ''}${copy.profit?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>

                  {copy.status === 'active' && (
                    <Button
                      variant="outline"
                      className="w-full border-destructive text-destructive hover:bg-destructive/10"
                      onClick={() => handleStopCopy(copy._id)}
                    >
                      Stop Copy
                    </Button>
                  )}
                </div>
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