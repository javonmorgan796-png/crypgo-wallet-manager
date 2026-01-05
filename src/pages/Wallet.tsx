import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDownLeft, ArrowUpRight, Wallet, Copy, Check, Bitcoin, DollarSign, Building2 } from 'lucide-react';
import { mockUser } from '@/data/mockData';
import { toast } from 'sonner';

const cryptoAddresses = {
  btc: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
  eth: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bE7c',
  usdt: 'TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9',
};

const bankDetails = {
  bankName: 'Chase Bank',
  accountName: 'CryptoVest Holdings LLC',
  accountNumber: '****4892',
  routingNumber: '021000021',
  swiftCode: 'CHASUS33',
};

export default function WalletPage() {
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedCrypto, setSelectedCrypto] = useState('btc');
  const [withdrawMethod, setWithdrawMethod] = useState('crypto');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDeposit = () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    toast.success(`Deposit request of $${depositAmount} submitted!`);
    setDepositAmount('');
  };

  const handleWithdraw = () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (parseFloat(withdrawAmount) > mockUser.balance) {
      toast.error('Insufficient balance');
      return;
    }
    if (withdrawMethod === 'crypto' && !withdrawAddress) {
      toast.error('Please enter your wallet address');
      return;
    }
    toast.success(`Withdrawal request of $${withdrawAmount} submitted!`);
    setWithdrawAmount('');
    setWithdrawAddress('');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Wallet</h1>
          <p className="text-muted-foreground">Manage your deposits and withdrawals</p>
        </div>

        {/* Balance Card */}
        <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-primary/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Available Balance</p>
                <p className="text-4xl font-bold text-foreground font-display">
                  ${mockUser.balance.toLocaleString()}
                </p>
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
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Crypto Deposit */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bitcoin className="h-5 w-5 text-primary" />
                    Crypto Deposit
                  </CardTitle>
                  <CardDescription>
                    Send cryptocurrency to the address below
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
                        <SelectItem value="btc">Bitcoin (BTC)</SelectItem>
                        <SelectItem value="eth">Ethereum (ETH)</SelectItem>
                        <SelectItem value="usdt">USDT (TRC-20)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Wallet Address</Label>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={cryptoAddresses[selectedCrypto as keyof typeof cryptoAddresses]}
                        className="bg-secondary border-border font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(
                          cryptoAddresses[selectedCrypto as keyof typeof cryptoAddresses],
                          'crypto'
                        )}
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

                  <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
                    <p className="text-sm text-warning">
                      Only send {selectedCrypto.toUpperCase()} to this address. Sending other cryptocurrencies may result in permanent loss.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Bank Transfer */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Bank Transfer
                  </CardTitle>
                  <CardDescription>
                    Transfer funds from your bank account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {Object.entries(bankDetails).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                        <span className="text-sm text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{value}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => copyToClipboard(value, key)}
                          >
                            {copied === key ? (
                              <Check className="h-3 w-3 text-primary" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 pt-4 border-t border-border">
                    <Label>Amount to Deposit (USD)</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          className="pl-9 bg-secondary border-border"
                        />
                      </div>
                      <Button onClick={handleDeposit} className="bg-primary text-primary-foreground hover:bg-primary/90">
                        Confirm
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Withdraw Tab */}
          <TabsContent value="withdraw" className="mt-6">
            <Card className="bg-card border-border max-w-xl">
              <CardHeader>
                <CardTitle>Withdraw Funds</CardTitle>
                <CardDescription>
                  Withdraw to your crypto wallet or bank account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Withdrawal Method</Label>
                  <Select value={withdrawMethod} onValueChange={setWithdrawMethod}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="crypto">Cryptocurrency</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {withdrawMethod === 'crypto' && (
                  <>
                    <div className="space-y-2">
                      <Label>Select Cryptocurrency</Label>
                      <Select value={selectedCrypto} onValueChange={setSelectedCrypto}>
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="btc">Bitcoin (BTC)</SelectItem>
                          <SelectItem value="eth">Ethereum (ETH)</SelectItem>
                          <SelectItem value="usdt">USDT (TRC-20)</SelectItem>
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
                  </>
                )}

                {withdrawMethod === 'bank' && (
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <p className="text-sm text-muted-foreground">
                      Bank transfers will be sent to your registered bank account. Processing time: 1-3 business days.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Amount (USD)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="pl-9 bg-secondary border-border"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Available: ${mockUser.balance.toLocaleString()}
                  </p>
                </div>

                <div className="flex gap-3">
                  {[25, 50, 75, 100].map((percent) => (
                    <Button
                      key={percent}
                      variant="outline"
                      size="sm"
                      className="flex-1 border-border hover:bg-primary/10 hover:text-primary"
                      onClick={() => setWithdrawAmount((mockUser.balance * percent / 100).toFixed(2))}
                    >
                      {percent}%
                    </Button>
                  ))}
                </div>

                <Button 
                  onClick={handleWithdraw} 
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  size="lg"
                >
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Request Withdrawal
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
