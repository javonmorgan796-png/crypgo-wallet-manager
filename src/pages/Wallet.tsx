import { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDownLeft, ArrowUpRight, Wallet, Copy, Check, Bitcoin, Upload, FileImage, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserData } from '@/hooks/useUserData';
import api from '@/services/api';
import { FeedbackDialog } from '@/components/ui/success-dialog';
import { toast } from 'sonner';

const cryptoOptions = [
  { value: 'btc', label: 'Bitcoin (BTC)', address: '1E3CUe4SM1YXtS6rPnyAFjnPp5vuD2f1wC' },
  { value: 'eth', label: 'Ethereum (ETH)', address: '0x58964d82bae9153f91e06ae222a7b53c63313b22' },
  { value: 'usdt-trc20', label: 'USDT (TRC-20)', address: 'TAjj5GTpwRGYxdrNhGGYsUBXeqX5pHxauy' },
];

export default function WalletPage() {
  const { user, refreshUser } = useAuth();
  const { balance, isLoading: isDataLoading, refresh: refreshData } = useUserData();
  
  const [selectedCrypto, setSelectedCrypto] = useState('usdt-trc20');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawCrypto, setWithdrawCrypto] = useState('usdt-trc20');
  const [copied, setCopied] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  }>({
    open: false,
    type: 'success',
    title: '',
    message: ''
  });

  const currentCrypto = cryptoOptions.find(c => c.value === selectedCrypto);
  const userBalance = user?.balance ?? balance;

  // Auto-fetch balance on mount
  useEffect(() => {
    refreshData();
    refreshUser();
  }, []);

  // Load Smartsupp Live Chat
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).smartsupp) {
      (window as any)._smartsupp = (window as any)._smartsupp || {};
      (window as any)._smartsupp.key = '7e4e75d9f82cdd637468f9b81637a5f877932168';
      const d = document;
      const s = d.getElementsByTagName('script')[0];
      const c = d.createElement('script');
      c.type = 'text/javascript';
      c.charset = 'utf-8';
      c.async = true;
      c.src = 'https://www.smartsuppchat.com/loader.js?';
      s.parentNode?.insertBefore(c, s);
    }
  }, []);

  const showFeedback = (type: 'success' | 'error' | 'warning', title: string, message: string) => {
    setFeedback({ open: true, type, title, message });
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDepositSubmit = async () => {
    if (!depositAmount || parseFloat(depositAmount) < 100) {
      toast.error('Minimum deposit is $100');
      return;
    }
    if (!receiptFile) {
      toast.error('Please upload your payment receipt');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Submitting deposit:', { amount: depositAmount, method: selectedCrypto, file: receiptFile.name });
      
      const result = await api.deposit(parseFloat(depositAmount), selectedCrypto, receiptFile);
      
      console.log('Deposit result:', result);
      
      if (result.success) {
        showFeedback(
          'success',
          'Deposit Request Submitted!',
          `Your deposit of $${parseFloat(depositAmount).toLocaleString()} has been submitted successfully. We'll verify your payment and credit your account within 10-30 minutes.`
        );
        setDepositAmount('');
        setReceiptFile(null);
        setReceiptPreview(null);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        // Refresh user data
        await refreshUser();
        await refreshData();
      } else {
        showFeedback(
          'error',
          'Deposit Failed',
          result.message || result.error || 'Failed to submit deposit request. Please try again.'
        );
      }
    } catch (error: any) {
      console.error('Deposit error:', error);
      showFeedback(
        'error',
        'Deposit Error',
        error.message || 'Failed to submit deposit. Please check your connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (parseFloat(withdrawAmount) > userBalance) {
      toast.error('Insufficient balance');
      return;
    }
    if (!withdrawAddress) {
      toast.error('Please enter your wallet address');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await api.withdraw(parseFloat(withdrawAmount), withdrawAddress, withdrawCrypto);
      
      if (result.success) {
        showFeedback(
          'success',
          'Withdrawal Request Submitted!',
          `Your withdrawal of $${parseFloat(withdrawAmount).toLocaleString()} to your ${withdrawCrypto.toUpperCase()} wallet has been submitted. Processing time: 24 hours.`
        );
        setWithdrawAmount('');
        setWithdrawAddress('');
        // Refresh user data
        await refreshUser();
        await refreshData();
      } else {
        showFeedback(
          'error',
          'Withdrawal Failed',
          result.error || 'Failed to submit withdrawal request. Please try again.'
        );
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      showFeedback(
        'error',
        'Withdrawal Error',
        'Failed to submit withdrawal. Please check your connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      {/* Feedback Dialog */}
      <FeedbackDialog
        open={feedback.open}
        onOpenChange={(open) => setFeedback(prev => ({ ...prev, open }))}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        actionLabel="OK"
      />

      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Account</h1>
          <p className="text-muted-foreground">Manage your cryptocurrency deposits and withdrawals</p>
        </div>

        {/* Balance Card */}
        <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-primary/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-muted-foreground text-sm">Available Balance</p>
                  <button
                    type="button"
                    onClick={() => setBalanceVisible(!balanceVisible)}
                    className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
                    aria-label={balanceVisible ? 'Hide balance' : 'Show balance'}
                  >
                    {balanceVisible ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="mt-1">
                  {isDataLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-muted-foreground">Loading...</span>
                    </div>
                  ) : (
                    <p className="text-4xl font-bold text-foreground font-display">
                      {balanceVisible 
                        ? `$${userBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : '******'
                      }
                    </p>
                  )}
                </div>
              </div>
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Wallet className="h-8 w-8 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deposit/Withdraw Tabs */}
        <Tabs defaultValue="deposit" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-secondary">
            <TabsTrigger value="deposit" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ArrowDownLeft className="h-4 w-4 mr-2" />
              Deposit
            </TabsTrigger>
            <TabsTrigger value="withdraw" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Withdraw
            </TabsTrigger>
          </TabsList>

          {/* Deposit Tab */}
          <TabsContent value="deposit" className="mt-6">
            <Card className="bg-card border-border max-w-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bitcoin className="h-5 w-5 text-primary" />
                  Crypto Deposit
                </CardTitle>
                <CardDescription>
                  Send cryptocurrency to the address below and upload your payment receipt
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Cryptocurrency</Label>
                  <Select value={selectedCrypto} onValueChange={setSelectedCrypto}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cryptoOptions.map((crypto) => (
                        <SelectItem key={crypto.value} value={crypto.value}>
                          {crypto.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Wallet Address</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={currentCrypto?.address || ''}
                      className="bg-secondary border-border font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(currentCrypto?.address || '', 'crypto')}
                      className="border-border"
                    >
                      {copied === 'crypto' ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Deposit Amount (USD)</Label>
                  <Input
                    type="number"
                    placeholder="Enter amount (min $100)"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>

                {/* Receipt Upload */}
                <div className="space-y-2">
                  <Label>Upload Payment Receipt</Label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    {receiptPreview ? (
                      <div className="space-y-2">
                        <img
                          src={receiptPreview}
                          alt="Receipt preview"
                          className="max-h-32 mx-auto rounded-lg"
                        />
                        <p className="text-sm text-muted-foreground">{receiptFile?.name}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReceiptFile(null);
                            setReceiptPreview(null);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                          <Upload className="h-6 w-6 text-primary" />
                        </div>
                        <p className="text-sm text-foreground font-medium">Click to upload receipt</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
                  <p className="text-sm text-warning">
                    Only send {currentCrypto?.label} to this address. Sending other cryptocurrencies may result in permanent loss.
                  </p>
                </div>

                <Button 
                  onClick={handleDepositSubmit}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FileImage className="h-4 w-4 mr-2" />
                      Submit Deposit Request
                    </>
                  )}
                </Button>

                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <h4 className="font-medium text-foreground mb-2">Deposit Instructions:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Minimum deposit: $100 equivalent</li>
                    <li>Send crypto to the address above</li>
                    <li>Upload your transaction receipt/screenshot</li>
                    <li>Processing time: 10-30 minutes after verification</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Withdraw Tab */}
          <TabsContent value="withdraw" className="mt-6">
            <Card className="bg-card border-border max-w-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bitcoin className="h-5 w-5 text-primary" />
                  Crypto Withdrawal
                </CardTitle>
                <CardDescription>
                  Withdraw to your crypto wallet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Select Cryptocurrency</Label>
                  <Select value={withdrawCrypto} onValueChange={setWithdrawCrypto}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cryptoOptions.map((crypto) => (
                        <SelectItem key={crypto.value} value={crypto.value}>
                          {crypto.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Your Wallet Address</Label>
                  <Input
                    placeholder="Enter your wallet address"
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                    className="bg-secondary border-border font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Amount (USD)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="bg-secondary border-border"
                  />
                  <p className="text-xs text-muted-foreground">
                    Available: {balanceVisible 
                      ? `$${userBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '******'
                    }
                  </p>
                </div>

                <div className="flex gap-3">
                  {[25, 50, 75, 100].map((percent) => (
                    <Button
                      key={percent}
                      variant="outline"
                      size="sm"
                      className="flex-1 border-border hover:bg-primary/10 hover:text-primary"
                      onClick={() => setWithdrawAmount((userBalance * percent / 100).toFixed(2))}
                    >
                      {percent}%
                    </Button>
                  ))}
                </div>

                <Button 
                  onClick={handleWithdraw} 
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="h-4 w-4 mr-2" />
                      Request Withdrawal
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Withdrawals are processed within 24 hours. A network fee may apply.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
