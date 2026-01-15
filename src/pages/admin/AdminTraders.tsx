import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Loader2, Users, TrendingUp, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';

interface Trader {
  _id: string;
  name: string;
  avatar: string;
  specialization: string;
  bio: string;
  winRate: number;
  totalProfit: number;
  profitPercentage: number;
  followers: number;
  trades: number;
  riskLevel: 'low' | 'medium' | 'high';
  monthlyReturns: number[];
  minCopyAmount: number;
  maxCopyAmount: number;
  copierCount: number;
  totalCopiedAmount: number;
  isActive: boolean;
}

const defaultTraderData: TraderFormData = {
  name: '',
  specialization: '',
  bio: '',
  winRate: 75,
  totalProfit: 500000,
  profitPercentage: 45,
  followers: 1000,
  trades: 500,
  riskLevel: 'medium',
  monthlyReturns: [5, 8, 3, 12, -2, 7],
  minCopyAmount: 100,
  maxCopyAmount: 100000,
};

interface TraderFormData {
  name: string;
  specialization: string;
  bio: string;
  winRate: number;
  totalProfit: number;
  profitPercentage: number;
  followers: number;
  trades: number;
  riskLevel: 'low' | 'medium' | 'high';
  monthlyReturns: number[];
  minCopyAmount: number;
  maxCopyAmount: number;
}

export function AdminTraders() {
  const [traders, setTraders] = useState<Trader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTrader, setEditingTrader] = useState<Trader | null>(null);
  const [traderData, setTraderData] = useState<TraderFormData>(defaultTraderData);
  const { toast } = useToast();

  useEffect(() => {
    fetchTraders();
  }, []);

  const fetchTraders = async () => {
    setIsLoading(true);
    try {
      const result = await api.getTraders();
      if (result.success && result.data) {
        setTraders(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch traders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (trader?: Trader) => {
    if (trader) {
      setEditingTrader(trader);
      setTraderData({
        name: trader.name,
        specialization: trader.specialization,
        bio: trader.bio || '',
        winRate: trader.winRate,
        totalProfit: trader.totalProfit,
        profitPercentage: trader.profitPercentage,
        followers: trader.followers,
        trades: trader.trades,
        riskLevel: trader.riskLevel,
        monthlyReturns: trader.monthlyReturns,
        minCopyAmount: trader.minCopyAmount,
        maxCopyAmount: trader.maxCopyAmount,
      });
    } else {
      setEditingTrader(null);
      setTraderData(defaultTraderData);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!traderData.name || !traderData.specialization) {
      toast({
        title: 'Error',
        description: 'Name and specialization are required',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let result;
      if (editingTrader) {
        result = await api.adminUpdateTrader(editingTrader._id, traderData);
      } else {
        result = await api.adminCreateTrader(traderData);
      }

      if (result.success) {
        toast({
          title: 'Success',
          description: editingTrader ? 'Trader updated successfully' : 'Trader created successfully',
        });
        setIsDialogOpen(false);
        fetchTraders();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save trader',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save trader',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (traderId: string) => {
    if (!confirm('Are you sure you want to deactivate this trader?')) return;

    try {
      const result = await api.adminUpdateTrader(traderId, { isActive: false });
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Trader deactivated successfully',
        });
        fetchTraders();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to deactivate trader',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to deactivate trader',
        variant: 'destructive',
      });
    }
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Professional Traders</h2>
          <p className="text-muted-foreground">Manage copy trading traders</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Trader
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Traders
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{traders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Copiers
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {traders.reduce((sum, t) => sum + (t.copierCount || 0), 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Copied Amount
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ${traders.reduce((sum, t) => sum + (t.totalCopiedAmount || 0), 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Traders Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : traders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trader</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Win Rate</TableHead>
                  <TableHead>Profit %</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Copiers</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {traders.map((trader) => (
                  <TableRow key={trader._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img
                          src={trader.avatar}
                          alt={trader.name}
                          className="h-10 w-10 rounded-full"
                        />
                        <div>
                          <p className="font-medium">{trader.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {trader.followers.toLocaleString()} followers
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{trader.specialization}</TableCell>
                    <TableCell>{trader.winRate}%</TableCell>
                    <TableCell className="text-primary">+{trader.profitPercentage}%</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getRiskColor(trader.riskLevel)}>
                        {trader.riskLevel}
                      </Badge>
                    </TableCell>
                    <TableCell>{trader.copierCount || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(trader)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(trader._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No traders yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first professional trader to enable copy trading
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Trader
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTrader ? 'Edit Trader' : 'Add New Trader'}
            </DialogTitle>
            <DialogDescription>
              {editingTrader
                ? 'Update the trader information below'
                : 'Fill in the details to create a new professional trader'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={traderData.name}
                  onChange={(e) => setTraderData({ ...traderData, name: e.target.value })}
                  placeholder="e.g., Alex Chen"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization *</Label>
                <Input
                  id="specialization"
                  value={traderData.specialization}
                  onChange={(e) => setTraderData({ ...traderData, specialization: e.target.value })}
                  placeholder="e.g., Bitcoin & Altcoins"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={traderData.bio}
                onChange={(e) => setTraderData({ ...traderData, bio: e.target.value })}
                placeholder="Brief description of the trader..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="winRate">Win Rate (%)</Label>
                <Input
                  id="winRate"
                  type="number"
                  min={0}
                  max={100}
                  value={traderData.winRate}
                  onChange={(e) => setTraderData({ ...traderData, winRate: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profitPercentage">Profit Percentage</Label>
                <Input
                  id="profitPercentage"
                  type="number"
                  value={traderData.profitPercentage}
                  onChange={(e) => setTraderData({ ...traderData, profitPercentage: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="riskLevel">Risk Level</Label>
                <Select
                  value={traderData.riskLevel}
                  onValueChange={(value: 'low' | 'medium' | 'high') =>
                    setTraderData({ ...traderData, riskLevel: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalProfit">Total Profit ($)</Label>
                <Input
                  id="totalProfit"
                  type="number"
                  value={traderData.totalProfit}
                  onChange={(e) => setTraderData({ ...traderData, totalProfit: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="followers">Followers</Label>
                <Input
                  id="followers"
                  type="number"
                  value={traderData.followers}
                  onChange={(e) => setTraderData({ ...traderData, followers: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trades">Total Trades</Label>
                <Input
                  id="trades"
                  type="number"
                  value={traderData.trades}
                  onChange={(e) => setTraderData({ ...traderData, trades: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minCopyAmount">Min Copy Amount ($)</Label>
                <Input
                  id="minCopyAmount"
                  type="number"
                  value={traderData.minCopyAmount}
                  onChange={(e) => setTraderData({ ...traderData, minCopyAmount: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxCopyAmount">Max Copy Amount ($)</Label>
                <Input
                  id="maxCopyAmount"
                  type="number"
                  value={traderData.maxCopyAmount}
                  onChange={(e) => setTraderData({ ...traderData, maxCopyAmount: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Monthly Returns (comma-separated)</Label>
              <Input
                value={traderData.monthlyReturns.join(', ')}
                onChange={(e) => {
                  const returns = e.target.value.split(',').map((v) => parseFloat(v.trim()) || 0);
                  setTraderData({ ...traderData, monthlyReturns: returns });
                }}
                placeholder="e.g., 5, 8, 3, 12, -2, 7"
              />
              <p className="text-xs text-muted-foreground">
                Enter 6 values representing last 6 months performance
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingTrader ? (
                'Update Trader'
              ) : (
                'Create Trader'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
