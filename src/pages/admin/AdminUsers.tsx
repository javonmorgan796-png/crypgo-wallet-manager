import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Search, 
  MoreHorizontal, 
  Eye, 
  Ban, 
  Mail, 
  Shield,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Mock data
const mockUsers = [
  { id: '1', name: 'John Doe', email: 'john@example.com', status: 'active', kycStatus: 'approved', balance: 15000, createdAt: '2024-01-15' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'active', kycStatus: 'pending', balance: 8500, createdAt: '2024-02-20' },
  { id: '3', name: 'Bob Wilson', email: 'bob@example.com', status: 'suspended', kycStatus: 'rejected', balance: 0, createdAt: '2024-03-10' },
  { id: '4', name: 'Alice Brown', email: 'alice@example.com', status: 'active', kycStatus: 'approved', balance: 25000, createdAt: '2024-01-05' },
  { id: '5', name: 'Charlie Davis', email: 'charlie@example.com', status: 'active', kycStatus: 'none', balance: 3200, createdAt: '2024-04-01' },
];

export function AdminUsers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState(mockUsers);

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSuspendUser = (userId: string) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, status: user.status === 'suspended' ? 'active' : 'suspended' }
        : user
    ));
    toast({
      title: "User Updated",
      description: "User status has been changed",
    });
  };

  const handleSendEmail = (userId: string) => {
    toast({
      title: "Email Dialog",
      description: "Email composition would open here",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Active</Badge>;
      case 'suspended':
        return <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20">Suspended</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">User Management</h2>
        <p className="text-muted-foreground">View and manage all registered users</p>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>KYC</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell>{getKYCBadge(user.kycStatus)}</TableCell>
                  <TableCell>${user.balance.toLocaleString()}</TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSendEmail(user.id)}>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Email
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSuspendUser(user.id)}>
                          <Ban className="h-4 w-4 mr-2" />
                          {user.status === 'suspended' ? 'Activate' : 'Suspend'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
