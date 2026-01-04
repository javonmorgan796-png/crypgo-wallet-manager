import { useState } from 'react';
import { Check, Clock, Zap, Crown, Star } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { investmentPlans, mockInvestments } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function Investments() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [investAmount, setInvestAmount] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const fixedPlans = investmentPlans.filter((p) => p.type === 'fixed');
  const timeBasedPlans = investmentPlans.filter((p) => p.type === 'time-based');

  const handleInvest = () => {
    const plan = investmentPlans.find((p) => p.id === selectedPlan);
    if (!plan || !investAmount) return;

    const amount = parseFloat(investAmount);
    if (amount < plan.minAmount || amount > plan.maxAmount) {
      toast({
        title: 'Invalid amount',
        description: `Amount must be between $${plan.minAmount} and $${plan.maxAmount}`,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Investment successful!',
      description: `You have invested $${amount.toLocaleString()} in ${plan.name}`,
    });
    setDialogOpen(false);
    setInvestAmount('');
    setSelectedPlan(null);
  };

  const openInvestDialog = (planId: string) => {
    setSelectedPlan(planId);
    setDialogOpen(true);
  };

  const selectedPlanData = investmentPlans.find((p) => p.id === selectedPlan);

  const getIcon = (planName: string) => {
    if (planName.includes('Bronze')) return Zap;
    if (planName.includes('Silver')) return Star;
    if (planName.includes('Gold')) return Crown;
    if (planName.includes('Platinum')) return Crown;
    return Clock;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Investment Plans</h1>
          <p className="text-muted-foreground">Choose a plan that fits your investment goals</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="fixed" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="fixed" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Fixed Tier Plans
            </TabsTrigger>
            <TabsTrigger value="time-based" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Time-Based Plans
            </TabsTrigger>
            <TabsTrigger value="my-investments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              My Investments
            </TabsTrigger>
          </TabsList>

          {/* Fixed Tier Plans */}
          <TabsContent value="fixed" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {fixedPlans.map((plan) => {
                const Icon = getIcon(plan.name);
                return (
                  <Card
                    key={plan.id}
                    className={`relative bg-card border-border hover:border-primary/50 transition-all duration-300 hover-lift ${
                      plan.popular ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                        MOST POPULAR
                      </div>
                    )}
                    <CardHeader className="text-center pb-2">
                      <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                        <Icon className="h-7 w-7 text-primary" />
                      </div>
                      <CardTitle className="font-display text-2xl">{plan.name}</CardTitle>
                      <p className="text-4xl font-bold text-primary mt-2">{plan.roi}%</p>
                      <p className="text-sm text-muted-foreground">ROI</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center text-sm text-muted-foreground">
                        <p>${plan.minAmount.toLocaleString()} - ${plan.maxAmount.toLocaleString()}</p>
                        <p>{plan.duration} days lock period</p>
                      </div>
                      <ul className="space-y-2">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary flex-shrink-0" />
                            <span className="text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        onClick={() => openInvestDialog(plan.id)}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Invest Now
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Time-Based Plans */}
          <TabsContent value="time-based" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {timeBasedPlans.map((plan) => (
                <Card
                  key={plan.id}
                  className="bg-card border-border hover:border-primary/50 transition-all duration-300 hover-lift"
                >
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                      <Clock className="h-7 w-7 text-primary" />
                    </div>
                    <CardTitle className="font-display text-xl">{plan.name}</CardTitle>
                    <p className="text-4xl font-bold text-primary mt-2">{plan.roi}%</p>
                    <p className="text-sm text-muted-foreground">ROI in {plan.duration} days</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-center text-sm text-muted-foreground">{plan.description}</p>
                    <div className="text-center text-sm">
                      <p className="text-muted-foreground">
                        Min: ${plan.minAmount.toLocaleString()} | Max: ${plan.maxAmount.toLocaleString()}
                      </p>
                    </div>
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={() => openInvestDialog(plan.id)}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Invest Now
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* My Investments */}
          <TabsContent value="my-investments" className="space-y-6">
            <div className="grid gap-4">
              {mockInvestments.map((investment) => (
                <Card key={investment.id} className="bg-card border-border">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                            investment.status === 'active'
                              ? 'bg-primary/10 text-primary'
                              : investment.status === 'completed'
                              ? 'bg-green-500/10 text-green-500'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <Crown className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{investment.planName}</h3>
                          <p className="text-sm text-muted-foreground capitalize">
                            {investment.type} plan • {investment.status}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                          <p className="text-sm text-muted-foreground">Invested</p>
                          <p className="font-semibold text-foreground">
                            ${investment.amount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Expected Return</p>
                          <p className="font-semibold text-primary">
                            ${investment.expectedReturn.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">ROI</p>
                          <p className="font-semibold text-primary">+{investment.roi}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">End Date</p>
                          <p className="font-semibold text-foreground">
                            {new Date(investment.endDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Investment Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">
                Invest in {selectedPlanData?.name}
              </DialogTitle>
              <DialogDescription>
                Enter the amount you want to invest. ROI: {selectedPlanData?.roi}% over{' '}
                {selectedPlanData?.duration} days.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Investment Amount (USD)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder={`Min: $${selectedPlanData?.minAmount.toLocaleString()}`}
                  value={investAmount}
                  onChange={(e) => setInvestAmount(e.target.value)}
                  className="bg-secondary border-border"
                />
                <p className="text-sm text-muted-foreground">
                  Range: ${selectedPlanData?.minAmount.toLocaleString()} - $
                  {selectedPlanData?.maxAmount.toLocaleString()}
                </p>
              </div>
              {investAmount && (
                <div className="p-4 rounded-lg bg-secondary/50">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expected Return</span>
                    <span className="font-semibold text-primary">
                      $
                      {(
                        parseFloat(investAmount) *
                        (1 + (selectedPlanData?.roi || 0) / 100)
                      ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-muted-foreground">Profit</span>
                    <span className="font-semibold text-primary">
                      +$
                      {(
                        parseFloat(investAmount) *
                        ((selectedPlanData?.roi || 0) / 100)
                      ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="flex-1 border-border"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInvest}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={!investAmount}
                >
                  Confirm Investment
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}