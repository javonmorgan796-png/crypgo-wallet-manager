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
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  TableRow 
} from '@/components/ui/table';
import { 
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  Pause,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FeedbackDialog } from '@/components/ui/success-dialog';
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

const defaultSignal = {
  asset: '',
  type: 'buy' as 'buy' | 'sell' | 'hold',
  entryPrice: 0,
  takeProfit: 0,
  stopLoss: 0,
  notes: ''
};

interface CloseData {
  closedPrice: number;
  result: 'profit' | 'loss' | 'breakeven';
}

export function AdminSignals() {
  const { toast } = useToast();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(defaultSignal);
  const [closeData, setCloseData] = useState<CloseData>({ closedPrice: 0, result: 'profit' });
  
  // Feedback dialog state
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const showFeedback = (type: 'success' | 'error', title: string, message: string) => {
    setFeedbackType(type);
    setFeedbackTitle(title);
    setFeedbackMessage(message);
    setFeedbackOpen(true);
  };

  const fetchSignals = async () => {
    setIsLoading(true);
    try {
      const result = await api.adminGetSignals();
      if (result.success && result.data) {
        setSignals(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch signals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
  }, []);

  const handleCreate = async () => {
    if (!formData.asset || !formData.entryPrice) {
      toast({
        title: 'Error',
        description: 'Asset and entry price are required',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await api.adminCreateSignal(formData);
      if (result.success) {
        showFeedback('success', 'Signal Created!', `${formData.type.toUpperCase()} signal for ${formData.asset} has been published to all users.`);
        setShowCreateDialog(false);
        setFormData(defaultSignal);
        fetchSignals();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      showFeedback('error', 'Failed to Create Signal', error.message || 'Please try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSignal = async () => {
    if (!selectedSignal || !closeData.closedPrice) return;

    setIsSubmitting(true);
    try {
      const result = await api.adminCloseSignal(selectedSignal._id, closeData);
      if (result.success) {
        showFeedback('success', 'Signal Closed!', `The ${selectedSignal.asset} signal has been closed with ${closeData.result} result.`);
        setShowCloseDialog(false);
        setSelectedSignal(null);
        fetchSignals();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      showFeedback('error', 'Failed to Close Signal', error.message || 'Please try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this signal?')) return;

    try {
      const result = await api.adminDeleteSignal(id);
      if (result.success) {
        showFeedback('success', 'Signal Deleted', 'The signal has been removed successfully.');
        fetchSignals();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      showFeedback('error', 'Failed to Delete', error.message || 'Please try again');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'buy':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'sell':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Pause className="h-4 w-4 text-amber-500" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'buy':
        return <Badge className="bg-green-500/10 text-green-500">BUY</Badge>;
      case 'sell':
        return <Badge className="bg-red-500/10 text-red-500">SELL</Badge>;
      default:
        return <Badge className="bg-amber-500/10 text-amber-500">HOLD</Badge>;
    }
  };

  const getStatusBadge = (status: string, result?: string) => {
    if (status === 'active') {
      return <Badge variant="outline" className="border-primary text-primary">ACTIVE</Badge>;
    }
    if (result === 'profit') {
      return <Badge className="bg-green-500/10 text-green-500">PROFIT</Badge>;
    }
    if (result === 'loss') {
      return <Badge className="bg-red-500/10 text-red-500">LOSS</Badge>;
    }
    return <Badge variant="secondary">CLOSED</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Signal Management</h2>
          <p className="text-muted-foreground">Create and manage trading signals for users</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSignals} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-primary">
            <Plus className="h-4 w-4 mr-2" />
            New Signal
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Signals</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : signals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No signals created yet. Click "New Signal" to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Entry Price</TableHead>
                  <TableHead>TP / SL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signals.map((signal) => (
                  <TableRow key={signal._id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(signal.type)}
                        <span className="font-medium">{signal.asset}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(signal.type)}</TableCell>
                    <TableCell>${signal.entryPrice.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {signal.takeProfit && <span className="text-green-500">TP: ${signal.takeProfit}</span>}
                        {signal.takeProfit && signal.stopLoss && ' / '}
                        {signal.stopLoss && <span className="text-red-500">SL: ${signal.stopLoss}</span>}
                        {!signal.takeProfit && !signal.stopLoss && '-'}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(signal.status, signal.result)}</TableCell>
                    <TableCell>
                      {signal.profitLoss !== undefined ? (
                        <span className={signal.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}>
                          {signal.profitLoss >= 0 ? '+' : ''}{signal.profitLoss.toFixed(2)}%
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{new Date(signal.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {signal.status === 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedSignal(signal);
                              setCloseData({ closedPrice: signal.entryPrice, result: 'profit' });
                              setShowCloseDialog(true);
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Close
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(signal._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Signal Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Signal</DialogTitle>
            <DialogDescription>
              Create a new trading signal that will be sent to all users
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Asset</Label>
                <Input
                  placeholder="BTC, ETH, SOL..."
                  value={formData.asset}
                  onChange={(e) => setFormData({ ...formData, asset: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label>Signal Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'buy' | 'sell' | 'hold') => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">BUY</SelectItem>
                    <SelectItem value="sell">SELL</SelectItem>
                    <SelectItem value="hold">HOLD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Entry Price ($)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={formData.entryPrice || ''}
                onChange={(e) => setFormData({ ...formData, entryPrice: parseFloat(e.target.value) })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Take Profit ($)</Label>
                <Input
                  type="number"
                  placeholder="Optional"
                  value={formData.takeProfit || ''}
                  onChange={(e) => setFormData({ ...formData, takeProfit: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Stop Loss ($)</Label>
                <Input
                  type="number"
                  placeholder="Optional"
                  value={formData.stopLoss || ''}
                  onChange={(e) => setFormData({ ...formData, stopLoss: parseFloat(e.target.value) })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Additional notes or analysis..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Signal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Signal Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Close Signal</DialogTitle>
            <DialogDescription>
              Close the {selectedSignal?.asset} signal and record the result
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Closed Price ($)</Label>
              <Input
                type="number"
                value={closeData.closedPrice || ''}
                onChange={(e) => setCloseData({ ...closeData, closedPrice: parseFloat(e.target.value) })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Result</Label>
              <Select
                value={closeData.result}
                onValueChange={(value: 'profit' | 'loss' | 'breakeven') => setCloseData({ ...closeData, result: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="profit">Profit</SelectItem>
                  <SelectItem value="loss">Loss</SelectItem>
                  <SelectItem value="breakeven">Breakeven</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCloseSignal} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Close Signal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <FeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        type={feedbackType}
        title={feedbackTitle}
        message={feedbackMessage}
      />
    </div>
  );
}
