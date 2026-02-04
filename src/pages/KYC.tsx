import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Upload, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  FileText,
  User,
  CreditCard,
  Camera,
  Loader2
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { FeedbackDialog } from '@/components/ui/success-dialog';

type VerificationStatus = 'not_started' | 'pending' | 'verified' | 'rejected';

interface KYCStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: VerificationStatus;
}

interface FeedbackState {
  open: boolean;
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
}

export default function KYC() {
  const { toast } = useToast();
  const { user, refreshUser } = useAuth();
  const [documentType, setDocumentType] = useState('');
  const [frontDocument, setFrontDocument] = useState<File | null>(null);
  const [backDocument, setBackDocument] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [addressProof, setAddressProof] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({
    open: false,
    type: 'success',
    title: '',
    message: ''
  });

  // Get verification status from user's KYC status
  const getVerificationStatus = (): VerificationStatus => {
    if (!user?.kycStatus || user.kycStatus === 'none') return 'not_started';
    if (user.kycStatus === 'pending') return 'pending';
    if (user.kycStatus === 'approved') return 'verified';
    if (user.kycStatus === 'rejected') return 'rejected';
    return 'not_started';
  };

  const verificationStatus = getVerificationStatus();

  const kycSteps: KYCStep[] = [
    {
      id: 'personal',
      title: 'Personal Information',
      description: 'Basic details verified from signup',
      icon: <User className="h-5 w-5" />,
      status: 'verified',
    },
    {
      id: 'identity',
      title: 'Identity Document',
      description: 'Government-issued ID verification',
      icon: <CreditCard className="h-5 w-5" />,
      status: verificationStatus,
    },
    {
      id: 'selfie',
      title: 'Selfie Verification',
      description: 'Photo holding your ID',
      icon: <Camera className="h-5 w-5" />,
      status: verificationStatus === 'verified' ? 'verified' : 'not_started',
    },
    {
      id: 'address',
      title: 'Address Verification',
      description: 'Proof of residence document',
      icon: <FileText className="h-5 w-5" />,
      status: verificationStatus === 'verified' ? 'verified' : 'not_started',
    },
  ];

  const completedSteps = kycSteps.filter(s => s.status === 'verified').length;
  const progress = (completedSteps / kycSteps.length) * 100;

  const showFeedback = (type: 'success' | 'error' | 'warning', title: string, message: string) => {
    setFeedback({ open: true, type, title, message });
  };

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-primary/20 text-primary border-0"><CheckCircle2 className="h-3 w-3 mr-1" /> Verified</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-0"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive/20 text-destructive border-0"><AlertCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Not Started</Badge>;
    }
  };

  const handleFileChange = (setter: (file: File | null) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      setter(file);
      toast({
        title: "File uploaded",
        description: `${file.name} has been selected`,
      });
    }
  };

  const handleSubmit = async () => {
    if (!documentType) {
      showFeedback('error', 'Document Type Required', 'Please select a document type before submitting.');
      return;
    }

    if (!frontDocument) {
      showFeedback('error', 'Document Required', 'Please upload the front of your ID document.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData with the files
      const formData = new FormData();
      formData.append('documentType', documentType);
      
      if (frontDocument) {
        formData.append('id_front', frontDocument);
      }
      if (backDocument) {
        formData.append('id_back', backDocument);
      }
      if (selfie) {
        formData.append('selfie', selfie);
      }
      if (addressProof) {
        formData.append('proof_of_address', addressProof);
      }

      const result = await api.submitKYC(formData);

      if (result.success) {
        showFeedback(
          'success',
          'KYC Submitted Successfully!',
          'Your documents have been submitted for verification. This usually takes 24-48 hours. We\'ll notify you once the review is complete.'
        );
        
        // Refresh user data to get updated KYC status
        await refreshUser();
        
        // Clear form
        setDocumentType('');
        setFrontDocument(null);
        setBackDocument(null);
        setSelfie(null);
        setAddressProof(null);
      } else {
        showFeedback(
          'error',
          'Submission Failed',
          result.message || 'Failed to submit KYC documents. Please try again.'
        );
      }
    } catch (error: any) {
      console.error('KYC submission error:', error);
      showFeedback(
        'error',
        'Submission Failed',
        error.message || 'An error occurred while submitting your documents. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Feedback Dialog */}
        <FeedbackDialog
          open={feedback.open}
          onOpenChange={(open) => setFeedback(prev => ({ ...prev, open }))}
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
        />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              KYC Verification
            </h1>
            <p className="text-muted-foreground mt-1">
              Complete your identity verification to unlock all features
            </p>
          </div>
          {getStatusBadge(verificationStatus)}
        </div>

        {/* Progress */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-foreground">Verification Progress</span>
              <span className="text-sm text-muted-foreground">{completedSteps} of {kycSteps.length} steps</span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        {/* Steps Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kycSteps.map((step, index) => (
            <Card key={step.id} className={`bg-card border-border ${step.status === 'verified' ? 'border-primary/50' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${step.status === 'verified' ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                    {step.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Step {index + 1}</span>
                    </div>
                    <h4 className="font-medium text-foreground text-sm">{step.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                    <div className="mt-2">
                      {getStatusBadge(step.status)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Rejection Notice */}
        {verificationStatus === 'rejected' && (
          <Card className="bg-destructive/10 border-destructive/30">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-foreground">Verification Rejected</h3>
                  <p className="text-muted-foreground mt-1">
                    Your previous submission was rejected. Please submit new documents below.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Form */}
        {verificationStatus !== 'verified' && verificationStatus !== 'pending' && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Upload Documents</CardTitle>
              <CardDescription>
                Please upload clear photos of your documents. All files must be under 10MB.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Document Type */}
              <div className="space-y-2">
                <Label>Document Type *</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="drivers_license">Driver's License</SelectItem>
                    <SelectItem value="national_id">National ID Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Document Uploads */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Front of ID */}
                <div className="space-y-2">
                  <Label>Front of ID Document *</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      id="front-doc"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={handleFileChange(setFrontDocument)}
                    />
                    <label htmlFor="front-doc" className="cursor-pointer">
                      {frontDocument ? (
                        <div className="flex items-center justify-center gap-2 text-primary">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="text-sm">{frontDocument.name}</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Click to upload front</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Back of ID */}
                <div className="space-y-2">
                  <Label>Back of ID Document (if applicable)</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      id="back-doc"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={handleFileChange(setBackDocument)}
                    />
                    <label htmlFor="back-doc" className="cursor-pointer">
                      {backDocument ? (
                        <div className="flex items-center justify-center gap-2 text-primary">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="text-sm">{backDocument.name}</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Click to upload back</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Selfie */}
                <div className="space-y-2">
                  <Label>Selfie with ID</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      id="selfie"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange(setSelfie)}
                    />
                    <label htmlFor="selfie" className="cursor-pointer">
                      {selfie ? (
                        <div className="flex items-center justify-center gap-2 text-primary">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="text-sm">{selfie.name}</span>
                        </div>
                      ) : (
                        <>
                          <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Photo holding your ID</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Address Proof */}
                <div className="space-y-2">
                  <Label>Proof of Address</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      id="address-proof"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={handleFileChange(setAddressProof)}
                    />
                    <label htmlFor="address-proof" className="cursor-pointer">
                      {addressProof ? (
                        <div className="flex items-center justify-center gap-2 text-primary">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="text-sm">{addressProof.name}</span>
                        </div>
                      ) : (
                        <>
                          <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Utility bill or bank statement</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                className="w-full bg-primary hover:bg-primary/90" 
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Submit for Verification
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pending State */}
        {verificationStatus === 'pending' && (
          <Card className="bg-yellow-500/10 border-yellow-500/30">
            <CardContent className="p-8 text-center">
              <Clock className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">Verification In Progress</h3>
              <p className="text-muted-foreground">
                Your documents are being reviewed. This usually takes 24-48 hours. We'll notify you once the review is complete.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Verified State */}
        {verificationStatus === 'verified' && (
          <Card className="bg-primary/10 border-primary/30">
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">Verification Complete!</h3>
              <p className="text-muted-foreground">
                Your identity has been verified. You now have full access to all platform features including withdrawals.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Benefits Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Why Complete KYC?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/20 text-primary">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Enable Withdrawals</h4>
                  <p className="text-sm text-muted-foreground">Withdraw your funds securely to any wallet</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/20 text-primary">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Higher Limits</h4>
                  <p className="text-sm text-muted-foreground">Access higher deposit and withdrawal limits</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/20 text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Account Security</h4>
                  <p className="text-sm text-muted-foreground">Protect your account with verified identity</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}