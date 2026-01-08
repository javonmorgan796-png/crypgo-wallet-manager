import { useState } from 'react';
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
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Mock data
const mockTransactions = [
  { id: '1', type: 'deposit', userId: 'u1', userName: 'John Doe', amount: 5000, method: 'BTC', status: 'pending', receipt: '/placeholder.svg', createdAt: '2024-12-05T10:30:00' },
  { id: '2', type: 'withdrawal', userId: 'u2', userName: 'Jane Smith', amount: 2500, method: 'ETH', address: '0x742d35Cc6634C0532925a3b844Bc9e7595f...', status: 'pending', createdAt: '2024-12-05T09:15:00' },
  { id: '3', type: 'deposit', userId: 'u3', userName: 'Bob Wilson', amount: 10000, method: 'USDT', status: 'pending', receipt: '/placeholder.svg', createdAt: '2024-12-04T16:45:00' },
  { id: '4', type: 'withdrawal', userId: 'u4', userName: 'Alice Brown', amount: 1500, method: 'BTC', address: '3FZbgi29cpjq2GjdwV8eyHuJJnkLtktZc5...', status: 'pending', createdAt: '2024-12-04T14:20:00' },
  { id: '5', type: 'deposit', userId: 'u5', userName: 'Charlie Davis', amount: 3000, method: 'BTC', status: 'completed', receipt: '/placeholder.svg', createdAt: '2024-12-03T11:00:00' },
];

export function AdminTransactions() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState(mockTransactions);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedTransaction, setSelectedTransaction] = useState<typeof mockTransactions[0] | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [viewingReceipt, setViewingReceipt] = useState(false);

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.id.includes(searchQuery);
    
    if (activeTab === 'pending') return matchesSearch && tx.status === 'pending';
    if (activeTab === 'deposits') return matchesSearch && tx.type === 'deposit';
    if (activeTab === 'withdrawals') return matchesSearch && tx.type === 'withdrawal';
    return matchesSearch;
  });

  const handleApprove = (id: string) => {
    setTransactions(transactions.map(tx => 
      tx.id === id ? { ...tx, status: 'completed' } : tx
    ));
    toast({
      title: "Transaction Approved",
      description: "User has been notified of the approval",
    });
  };

  const handleReject = () => {
    if (!selectedTransaction) return;
    
    setTransactions(transactions.map(tx => 
      tx.id === selectedTransaction.id ? { ...tx, status: 'rejected' } : tx
    ));
    toast({
      title: "Transaction Rejected",
      description: "User has been notified with the rejection reason",
    });
    setShowRejectDialog(false);
    setRejectReason('');
    setSelectedTransaction(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-500"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-500"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Transaction Management</h2>
        <p className="text-muted-foreground">Review and approve deposits and withdrawals</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="pending">
                  Pending
                  <Badge variant="secondary" className="ml-2">
                    {transactions.filter(t => t.status === 'pending').length}
                  </Badge>
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
                <TableRow key={tx.id}>
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
                    <p className="font-medium">{tx.userName}</p>
                  </TableCell>
                  <TableCell className="font-medium">${tx.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{tx.method}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(tx.status)}</TableCell>
                  <TableCell>{new Date(tx.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {tx.type === 'deposit' && tx.receipt && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedTransaction(tx);
                            setViewingReceipt(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Receipt
                        </Button>
                      )}
                      {tx.type === 'withdrawal' && tx.address && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(tx.address!);
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
                            onClick={() => handleApprove(tx.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => {
                              setSelectedTransaction(tx);
                              setShowRejectDialog(true);
                            }}
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
        </CardContent>
      </Card>

      {/* View Receipt Dialog */}
      <Dialog open={viewingReceipt} onOpenChange={setViewingReceipt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Receipt</DialogTitle>
            <DialogDescription>
              Deposit receipt from {selectedTransaction?.userName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="aspect-[4/3] bg-muted rounded-lg overflow-hidden">
              <img 
                src={selectedTransaction?.receipt} 
                alt="Payment Receipt"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="mt-4 space-y-2">
              <p><strong>Amount:</strong> ${selectedTransaction?.amount.toLocaleString()}</p>
              <p><strong>Method:</strong> {selectedTransaction?.method}</p>
              <p><strong>Date:</strong> {selectedTransaction && new Date(selectedTransaction.createdAt).toLocaleString()}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingReceipt(false)}>
              Close
            </Button>
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
              disabled={!rejectReason.trim()}
            >
              Reject Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
