import { useState, useEffect } from 'react';
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
  Clock,
  Loader2,
  ImageIcon,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';

const BACKEND_URL = import.meta.env.VITE_RENDER_API_URL?.replace('/api', '') || 'https://greenbull-wallet-manager.onrender.com';

// Helper component for KYC document images - supports base64 data URIs and URLs
const KYCDocumentImage = ({ url, alt }: { url: string; alt: string }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const resolvedUrl = (() => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    if (url.startsWith('http')) return url;
    return `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  })();

  if (!resolvedUrl) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-muted-foreground">
        <ImageIcon className="h-8 w-8 mb-2" />
        <span className="text-sm">No image available</span>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-muted-foreground">
        <ImageIcon className="h-8 w-8 mb-2" />
        <span className="text-sm">Unable to load image</span>
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
        alt={alt}
        className={`w-full h-full object-cover transition-opacity ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
};

interface KYCDocument {
  type: string;
  url: string;
  uploadedAt: string;
}

interface KYCRequest {
  id: string;
  _id?: string;
  userId: string;
  userName: string;
  email: string;
  kycDocuments: KYCDocument[];
  submittedAt: string;
  status: string;
}

export function AdminKYC() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<KYCRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<KYCRequest | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [viewingDocuments, setViewingDocuments] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchKYCRequests();
  }, []);

  const fetchKYCRequests = async () => {
    setIsLoading(true);
    try {
      const result = await api.adminGetKYCRequests('pending');
      if (result.success && result.data) {
        console.log('KYC Requests raw data:', result.data);
        setRequests(result.data.map((r: any) => ({
          id: r._id || r.id,
          userId: r._id || r.id, // The user ID is the document ID
          userName: r.name || 'Unknown',
          email: r.email || '',
          kycDocuments: r.kycDocuments || [],
          submittedAt: r.kycDocuments?.[0]?.uploadedAt || r.createdAt,
          status: r.kycStatus || 'pending',
        })));
      }
    } catch (error) {
      console.error('Failed to fetch KYC requests:', error);
      toast({
        title: "Error",
        description: "Failed to load KYC requests",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    setIsProcessing(true);
    try {
      const result = await api.adminApproveKYC(userId);
      if (result.success) {
        setRequests(requests.filter(r => r.userId !== userId));
        toast({
          title: "KYC Approved",
          description: "User has been notified of their verification approval",
        });
        setViewingDocuments(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve KYC",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    
    setIsProcessing(true);
    try {
      const result = await api.adminRejectKYC(selectedRequest.userId, rejectReason);
      if (result.success) {
        setRequests(requests.filter(r => r.userId !== selectedRequest.userId));
        toast({
          title: "KYC Rejected",
          description: "User has been notified with the rejection reason",
        });
        setShowRejectDialog(false);
        setRejectReason('');
        setSelectedRequest(null);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject KYC",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getDocumentUrl = (url: string) => {
    if (!url) return '/placeholder.svg';
    if (url.startsWith('data:')) return url;
    if (url.startsWith('http')) return url;
    return `${BACKEND_URL}${url}`;
  };

  const getDocumentTypeName = (type: string) => {
    switch (type) {
      case 'id_front': return 'ID Front';
      case 'id_back': return 'ID Back';
      case 'selfie': return 'Selfie';
      case 'proof_of_address': return 'Proof of Address';
      default: return type;
    }
  };

  const getDocumentCount = (documents: KYCDocument[]) => {
    return documents?.length || 0;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
                  <TableHead>Documents</TableHead>
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
                        {getDocumentCount(request.kycDocuments)} document(s)
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {request.submittedAt 
                        ? new Date(request.submittedAt).toLocaleDateString()
                        : 'N/A'
                      }
                    </TableCell>
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
                          onClick={() => handleApprove(request.userId)}
                          disabled={isProcessing}
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
                          disabled={isProcessing}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>KYC Documents - {selectedRequest?.userName}</DialogTitle>
            <DialogDescription>
              Review the submitted identity documents ({selectedRequest?.email})
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest?.kycDocuments && selectedRequest.kycDocuments.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 py-4">
              {selectedRequest.kycDocuments.map((doc, index) => (
                <div key={index} className="space-y-2">
                  <p className="text-sm font-medium">{getDocumentTypeName(doc.type)}</p>
                  <div className="aspect-[4/3] bg-muted rounded-lg overflow-hidden relative">
                    <KYCDocumentImage url={doc.url} alt={getDocumentTypeName(doc.type)} />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => window.open(getDocumentUrl(doc.url), '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Full
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = getDocumentUrl(doc.url);
                        link.download = `${selectedRequest.userName}-${doc.type}`;
                        link.click();
                      }}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Uploaded: {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No documents found for this user</p>
              <p className="text-sm text-muted-foreground mt-2">
                The user may have submitted their KYC but the documents were not uploaded properly.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingDocuments(false)}>
              Close
            </Button>
            <Button 
              className="bg-green-500 hover:bg-green-600"
              onClick={() => {
                if (selectedRequest) {
                  handleApprove(selectedRequest.userId);
                }
              }}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
              Approve
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                setViewingDocuments(false);
                setShowRejectDialog(true);
              }}
              disabled={isProcessing}
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
              disabled={!rejectReason.trim() || isProcessing}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}