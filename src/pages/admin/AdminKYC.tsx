import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Eye, 
  CheckCircle, 
  XCircle, 
  FileText,
  Download,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Mock data
const mockKYCRequests = [
  { 
    id: '1', 
    userId: 'u1',
    userName: 'Jane Smith', 
    email: 'jane@example.com',
    documentType: 'passport',
    frontImage: '/placeholder.svg',
    backImage: '/placeholder.svg',
    selfie: '/placeholder.svg',
    submittedAt: '2024-12-01',
    status: 'pending'
  },
  { 
    id: '2', 
    userId: 'u2',
    userName: 'Charlie Davis', 
    email: 'charlie@example.com',
    documentType: 'drivers_license',
    frontImage: '/placeholder.svg',
    backImage: '/placeholder.svg',
    selfie: '/placeholder.svg',
    submittedAt: '2024-12-02',
    status: 'pending'
  },
  { 
    id: '3', 
    userId: 'u3',
    userName: 'Mike Johnson', 
    email: 'mike@example.com',
    documentType: 'national_id',
    frontImage: '/placeholder.svg',
    backImage: '/placeholder.svg',
    selfie: '/placeholder.svg',
    submittedAt: '2024-11-28',
    status: 'pending'
  },
];

export function AdminKYC() {
  const { toast } = useToast();
  const [requests, setRequests] = useState(mockKYCRequests);
  const [selectedRequest, setSelectedRequest] = useState<typeof mockKYCRequests[0] | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [viewingDocuments, setViewingDocuments] = useState(false);

  const handleApprove = (id: string) => {
    setRequests(requests.filter(r => r.id !== id));
    toast({
      title: "KYC Approved",
      description: "User has been notified of their verification approval",
    });
  };

  const handleReject = () => {
    if (!selectedRequest) return;
    
    setRequests(requests.filter(r => r.id !== selectedRequest.id));
    toast({
      title: "KYC Rejected",
      description: "User has been notified with the rejection reason",
    });
    setShowRejectDialog(false);
    setRejectReason('');
    setSelectedRequest(null);
  };

  const getDocumentTypeName = (type: string) => {
    switch (type) {
      case 'passport': return 'Passport';
      case 'drivers_license': return "Driver's License";
      case 'national_id': return 'National ID';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">KYC Verification</h2>
        <p className="text-muted-foreground">Review and approve user identity verification requests</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pending Requests</CardTitle>
              <CardDescription>{requests.length} requests awaiting review</CardDescription>
            </div>
            <Badge className="bg-yellow-500/10 text-yellow-500">
              <Clock className="h-3 w-3 mr-1" />
              {requests.length} Pending
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="font-semibold text-lg">All caught up!</h3>
              <p className="text-muted-foreground">No pending KYC requests to review</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Document Type</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.userName}</p>
                        <p className="text-sm text-muted-foreground">{request.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        <FileText className="h-3 w-3 mr-1" />
                        {getDocumentTypeName(request.documentType)}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(request.submittedAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setViewingDocuments(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm"
                          className="bg-green-500 hover:bg-green-600"
                          onClick={() => handleApprove(request.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowRejectDialog(true);
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
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

      {/* View Documents Dialog */}
      <Dialog open={viewingDocuments} onOpenChange={setViewingDocuments}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>KYC Documents - {selectedRequest?.userName}</DialogTitle>
            <DialogDescription>
              Review the submitted identity documents
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-3 gap-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Document Front</p>
              <div className="aspect-[4/3] bg-muted rounded-lg overflow-hidden">
                <img 
                  src={selectedRequest?.frontImage} 
                  alt="Document Front"
                  className="w-full h-full object-cover"
                />
              </div>
              <Button variant="outline" size="sm" className="w-full">
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">Document Back</p>
              <div className="aspect-[4/3] bg-muted rounded-lg overflow-hidden">
                <img 
                  src={selectedRequest?.backImage} 
                  alt="Document Back"
                  className="w-full h-full object-cover"
                />
              </div>
              <Button variant="outline" size="sm" className="w-full">
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">Selfie with Document</p>
              <div className="aspect-[4/3] bg-muted rounded-lg overflow-hidden">
                <img 
                  src={selectedRequest?.selfie} 
                  alt="Selfie"
                  className="w-full h-full object-cover"
                />
              </div>
              <Button variant="outline" size="sm" className="w-full">
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingDocuments(false)}>
              Close
            </Button>
            <Button 
              className="bg-green-500 hover:bg-green-600"
              onClick={() => {
                handleApprove(selectedRequest!.id);
                setViewingDocuments(false);
              }}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                setViewingDocuments(false);
                setShowRejectDialog(true);
              }}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject KYC Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this verification request.
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
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
