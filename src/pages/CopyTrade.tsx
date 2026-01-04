import { useState } from 'react';
import { Users, TrendingUp, Target, Shield, Search } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { mockTraders, mockCopyTrades } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CopyTrade() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrader, setSelectedTrader] = useState<string | null>(null);
  const [copyAmount, setCopyAmount] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const filteredTraders = mockTraders.filter(
    (trader) =>
      trader.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trader.specialization.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyTrader = () => {
    if (!selectedTrader || !copyAmount) return;

    const trader = mockTraders.find((t) => t.id === selectedTrader);
    toast({
      title: 'Copy trade started!',
      description: `You are now copying ${trader?.name} with $${parseFloat(copyAmount).toLocaleString()}`,
    });
    setDialogOpen(false);
    setCopyAmount('');
    setSelectedTrader(null);
  };

  const openCopyDialog = (traderId: string) => {
    setSelectedTrader(traderId);
    setDialogOpen(true);
  };

  const selectedTraderData = mockTraders.find((t) => t.id === selectedTrader);

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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredTraders.map((trader) => (
                <Card
                  key={trader.id}
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
                      onClick={() => openCopyDialog(trader.id)}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Copy Trader
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* My Copy Trades */}
          <TabsContent value="my-copies" className="space-y-4">
            {mockCopyTrades.length > 0 ? (
              mockCopyTrades.map((trade) => {
                const trader = mockTraders.find((t) => t.id === trade.traderId);
                return (
                  <Card key={trade.id} className="bg-card border-border">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <img
                            src={trader?.avatar}
                            alt={trade.traderName}
                            className="h-14 w-14 rounded-full border-2 border-primary"
                          />
                          <div>
                            <h3 className="font-semibold text-foreground">{trade.traderName}</h3>
                            <p className="text-sm text-muted-foreground">
                              Started: {new Date(trade.startDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div>
                            <p className="text-sm text-muted-foreground">Invested</p>
                            <p className="font-semibold text-foreground">
                              ${trade.amount.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Profit</p>
                            <p className="font-semibold text-primary">
                              +${trade.profit.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Return</p>
                            <p className="font-semibold text-primary">+{trade.profitPercentage}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Status</p>
                            <Badge
                              variant="outline"
                              className={
                                trade.status === 'active'
                                  ? 'bg-primary/10 text-primary border-primary/30'
                                  : 'bg-muted text-muted-foreground'
                              }
                            >
                              {trade.status}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="border-destructive text-destructive hover:bg-destructive/10"
                        >
                          Stop Copy
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
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
                Copy {selectedTraderData?.name}
              </DialogTitle>
              <DialogDescription>
                Enter the amount you want to allocate for copying this trader's strategies.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              {selectedTraderData && (
                <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50">
                  <img
                    src={selectedTraderData.avatar}
                    alt={selectedTraderData.name}
                    className="h-12 w-12 rounded-full border-2 border-primary"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{selectedTraderData.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedTraderData.specialization}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">+{selectedTraderData.profitPercentage}%</p>
                    <p className="text-xs text-muted-foreground">Total Return</p>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="copy-amount">Copy Amount (USD)</Label>
                <Input
                  id="copy-amount"
                  type="number"
                  placeholder="Minimum: $100"
                  value={copyAmount}
                  onChange={(e) => setCopyAmount(e.target.value)}
                  className="bg-secondary border-border"
                />
                <p className="text-sm text-muted-foreground">
                  This amount will be used to automatically copy the trader's positions.
                </p>
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
                  disabled={!copyAmount || parseFloat(copyAmount) < 100}
                >
                  Start Copying
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}