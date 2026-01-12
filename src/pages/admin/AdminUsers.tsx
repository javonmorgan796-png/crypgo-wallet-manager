import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Search, 
  MoreHorizontal, 
  Eye, 
  Ban, 
  Mail, 
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  DollarSign,
  Plus,
  Minus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  isVerified: boolean;
  kycStatus: 'none' | 'pending' | 'approved' | 'rejected';
  balance: number;
  totalInvested: number;
  totalProfit: number;
  createdAt: string;
  lastLogin?: string;
}

export function AdminUsers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceAction, setBalanceAction] = useState<'add' | 'subtract' | 'set'>('add');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const result = await api.adminGetUsers(1, 100);
      
      if (result.success && result.data) {
        setUsers(result.data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUpdateBalance = async () => {
    if (!selectedUser || !balanceAmount) return;
    
    setProcessingId(selectedUser._id);
    
    const amount = parseFloat(balanceAmount);
    let newBalance = selectedUser.balance;
    
    if (balanceAction === 'add') {
      newBalance += amount;
    } else if (balanceAction === 'subtract') {
      newBalance = Math.max(0, newBalance - amount);
    } else {
      newBalance = amount;
    }
    
    try {
      const result = await api.adminUpdateUser(selectedUser._id, { balance: newBalance });
      
      if (result.success) {
        toast({
          title: "Balance Updated",
          description: `User balance updated to $${newBalance.toLocaleString()}`,
        });
        fetchUsers();
        setShowBalanceDialog(false);
        setBalanceAmount('');
        setSelectedUser(null);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update balance",
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleSuspendUser = async (userId: string, currentlyVerified: boolean) => {
    setProcessingId(userId);
    try {
      const result = await api.adminUpdateUser(userId, { isVerified: !currentlyVerified });
      
      if (result.success) {
        toast({
          title: "User Updated",
          description: `User has been ${currentlyVerified ? 'suspended' : 'activated'}`,
        });
        fetchUsers();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleMakeAdmin = async (userId: string, currentRole: string) => {
    setProcessingId(userId);
    try {
      const newRole = currentRole === 'admin' ? 'user' : 'admin';
      const result = await api.adminUpdateUser(userId, { role: newRole });
      
      if (result.success) {
        toast({
          title: "Role Updated",
          description: `User is now ${newRole === 'admin' ? 'an admin' : 'a regular user'}`,
        });
        fetchUsers();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleSendEmail = (userId: string) => {
    toast({
      title: "Email Dialog",
      description: "Email composition would open here",
    });
  };

  const getStatusBadge = (isVerified: boolean) => {
    if (isVerified) {
      return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Active</Badge>;
    }
    return <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20">Suspended</Badge>;
  };

  const getKYCBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-500"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-500"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">Not Submitted</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return <Badge className="bg-purple-500/10 text-purple-500"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
    }
    return <Badge variant="outline">User</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">User Management</h2>
          <p className="text-muted-foreground">View and manage all registered users</p>
        </div>
        <Button variant="outline" onClick={fetchUsers} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Users</CardTitle>
              <CardDescription>{users.length} total users</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
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
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No users found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>KYC</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{getStatusBadge(user.isVerified)}</TableCell>
                    <TableCell>{getKYCBadge(user.kycStatus)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">${(user.balance || 0).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          Invested: ${(user.totalInvested || 0).toLocaleString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={processingId === user._id}>
                            {processingId === user._id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedUser(user);
                            setShowBalanceDialog(true);
                          }}>
                            <DollarSign className="h-4 w-4 mr-2" />
                            Manage Balance
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendEmail(user._id)}>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Email
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleMakeAdmin(user._id, user.role)}>
                            <Shield className="h-4 w-4 mr-2" />
                            {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSuspendUser(user._id, user.isVerified)}>
                            <Ban className="h-4 w-4 mr-2" />
                            {user.isVerified ? 'Suspend' : 'Activate'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Balance Management Dialog */}
      <Dialog open={showBalanceDialog} onOpenChange={setShowBalanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage User Balance</DialogTitle>
            <DialogDescription>
              Update balance for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="p-4 rounded-lg bg-secondary/50">
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-2xl font-bold">${(selectedUser?.balance || 0).toLocaleString()}</p>
            </div>
            
            <div className="space-y-2">
              <Label>Action</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={balanceAction === 'add' ? 'default' : 'outline'}
                  onClick={() => setBalanceAction('add')}
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
                <Button
                  type="button"
                  variant={balanceAction === 'subtract' ? 'default' : 'outline'}
                  onClick={() => setBalanceAction('subtract')}
                  className="flex-1"
                >
                  <Minus className="h-4 w-4 mr-1" />
                  Subtract
                </Button>
                <Button
                  type="button"
                  variant={balanceAction === 'set' ? 'default' : 'outline'}
                  onClick={() => setBalanceAction('set')}
                  className="flex-1"
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  Set
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            
            {balanceAmount && (
              <div className="p-4 rounded-lg bg-primary/10">
                <p className="text-sm text-muted-foreground">New Balance</p>
                <p className="text-xl font-bold text-primary">
                  ${(() => {
                    const amount = parseFloat(balanceAmount) || 0;
                    const current = selectedUser?.balance || 0;
                    if (balanceAction === 'add') return (current + amount).toLocaleString();
                    if (balanceAction === 'subtract') return Math.max(0, current - amount).toLocaleString();
                    return amount.toLocaleString();
                  })()}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowBalanceDialog(false);
              setBalanceAmount('');
              setSelectedUser(null);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateBalance}
              disabled={!balanceAmount || processingId === selectedUser?._id}
            >
              {processingId === selectedUser?._id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Update Balance'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
