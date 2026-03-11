import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Search,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle, 
  XCircle, 
  Clock,
  Eye,
  ExternalLink,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAdminWebSocket } from '@/hooks/useAdminWebSocket';
import api from '@/services/api';

const API_URL = import.meta.env.VITE_RENDER_API_URL?.replace('/api', '') || 'https://greenbull-wallet-manager.onrender.com';

// Helper component for receipt images - supports base64 data URIs and URLs
const ReceiptImage = ({ url }: { url: string }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const resolvedUrl = (() => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return `${API_URL}${url}`;
    return `${API_URL}/${url}`;
  })();

  if (!url) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-muted-foreground p-4">
        <Eye className="h-8 w-8 mb-2 opacity-50" />
        <span className="text-sm">No receipt uploaded</span>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-muted-foreground p-4">
        <Eye className="h-8 w-8 mb-2 opacity-50" />
        <span className="text-sm mb-2">Unable to load image</span>
        <p className="text-xs mt-2 opacity-60 text-center break-all max-w-full">
          {url.startsWith('data:') ? 'Base64 image data' : url.length > 50 ? `${url.substring(0, 50)}...` : url}
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
      <img 
        src={resolvedUrl}
        alt="Payment Receipt"
        className={`w-full h-full object-contain transition-opacity ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
};

interface Transaction {
  _id: string;
  type: 'deposit' | 'withdrawal' | 'copy-trade' | 'copy-trade-close';
  user: {
    _id: string;
    name: string;
    email: string;
  };
  amount: number;
  method: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  receiptUrl?: string;
  withdrawalAddress?: string;
  createdAt: string;
  rejectionReason?: string;
}

export function AdminTransactions() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [viewingReceipt, setViewingReceipt] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      // Build filters based on active tab
      const filters: { status?: string; type?: string } = {};
      
      if (activeTab === 'pending') {
        filters.status = 'pending';
      } else if (activeTab === 'deposits') {
        filters.type = 'deposit';
      } else if (activeTab === 'withdrawals') {
        filters.type = 'withdrawal';
      }
      // 'all' tab: no filters
      
      console.log('Fetching transactions with filters:', filters);
      const result = await api.adminGetTransactions(Object.keys(filters).length > 0 ? filters : undefined);
      console.log('Transactions result:', result);
      
      if (result.success) {
        // Handle both array and paginated response formats
        const txData = Array.isArray(result.data) ? result.data : (result.data as any)?.transactions || result.data || [];
        setTransactions(Array.isArray(txData) ? txData : []);
        console.log('Transactions loaded:', txData.length);
      } else {
        console.error('Failed to fetch transactions:', result.error);
        setTransactions([]);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch transactions",
        variant: "destructive"
      });
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // WebSocket for real-time updates
  const handleWebSocketEvent = useCallback((event: any) => {
    if (event.event === 'new_deposit' || event.event === 'new_withdrawal') {
      console.log('New transaction event received, refreshing...');
      fetchTransactions();
    }
  }, []);
  
  const { isConnected } = useAdminWebSocket(handleWebSocketEvent);

  useEffect(() => {
    fetchTransactions();
  }, [activeTab]);

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx._id.includes(searchQuery);
    
    return matchesSearch;
  });

  const pendingCount = transactions.filter(t => t.status === 'pending').length;

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const result = await api.adminApproveTransaction(id);
      
      if (result.success) {
        toast({
          title: "Transaction Approved",
          description: "User has been notified and their balance updated",
        });
        fetchTransactions();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve transaction",
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedTransaction) return;
    
    setProcessingId(selectedTransaction._id);
    try {
      const result = await api.adminRejectTransaction(selectedTransaction._id, rejectReason);
      
      if (result.success) {
        toast({
          title: "Transaction Rejected",
          description: "User has been notified with the rejection reason",
        });
        fetchTransactions();
        setShowRejectDialog(false);
        setRejectReason('');
        setSelectedTransaction(null);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject transaction",
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-500"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/10 text-red-500"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      'crypto_btc': 'Bitcoin',
      'crypto_eth': 'Ethereum',
      'crypto_usdt': 'USDT',
      'bank_transfer': 'Bank Transfer',
      'card': 'Card'
    };
    return labels[method] || method;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Transaction Management</h2>
          <p className="text-muted-foreground">Review and approve deposits and withdrawals</p>
        </div>
        <Button variant="outline" onClick={fetchTransactions} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="pending">
                  Pending
                  {pendingCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {pendingCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="deposits">Deposits</TabsTrigger>
                <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No transactions found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx) => (
                  <TableRow key={tx._id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {tx.type === 'deposit' ? (
                          <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                            <ArrowDownRight className="h-4 w-4 text-green-500" />
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center">
                            <ArrowUpRight className="h-4 w-4 text-red-500" />
                          </div>
                        )}
                        <span className="capitalize">{tx.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{tx.user?.name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{tx.user?.email || ''}</p>
                    </TableCell>
                    <TableCell className="font-medium">${tx.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getMethodLabel(tx.method)}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(tx.status)}</TableCell>
                    <TableCell>{new Date(tx.createdAt).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {tx.type === 'deposit' && tx.receiptUrl && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              console.log('Viewing receipt:', tx.receiptUrl);
                              setSelectedTransaction(tx);
                              setViewingReceipt(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Receipt
                          </Button>
                        )}
                        {tx.type === 'withdrawal' && tx.withdrawalAddress && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(tx.withdrawalAddress!);
                              toast({ title: "Address copied" });
                            }}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Address
                          </Button>
                        )}
                        {tx.status === 'pending' && (
                          <>
                            <Button 
                              size="sm"
                              className="bg-green-500 hover:bg-green-600"
                              onClick={() => handleApprove(tx._id)}
                              disabled={processingId === tx._id}
                            >
                              {processingId === tx._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => {
                                setSelectedTransaction(tx);
                                setShowRejectDialog(true);
                              }}
                              disabled={processingId === tx._id}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Receipt Dialog */}
      <Dialog open={viewingReceipt} onOpenChange={setViewingReceipt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Receipt</DialogTitle>
            <DialogDescription>
              Deposit receipt from {selectedTransaction?.user?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="aspect-[4/3] bg-muted rounded-lg overflow-hidden">
              {selectedTransaction?.receiptUrl && (
                <ReceiptImage url={selectedTransaction.receiptUrl} />
              )}
            </div>
            <div className="mt-4 space-y-2">
              <p><strong>Amount:</strong> ${selectedTransaction?.amount.toLocaleString()}</p>
              <p><strong>Method:</strong> {selectedTransaction && getMethodLabel(selectedTransaction.method)}</p>
              <p><strong>Date:</strong> {selectedTransaction && new Date(selectedTransaction.createdAt).toLocaleString()}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingReceipt(false)}>
              Close
            </Button>
            {selectedTransaction?.status === 'pending' && (
              <Button 
                className="bg-green-500 hover:bg-green-600"
                onClick={() => {
                  handleApprove(selectedTransaction._id);
                  setViewingReceipt(false);
                }}
              >
                Approve
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Transaction</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this transaction.
              The user will be notified.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || processingId === selectedTransaction?._id}
            >
              {processingId === selectedTransaction?._id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Reject Transaction'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
