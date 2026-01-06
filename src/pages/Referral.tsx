import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Gift, Users, DollarSign, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { mockUser } from '@/data/mockData';

const mockReferrals = [
  { id: '1', name: 'John S.', email: 'j***@email.com', joinedAt: '2024-12-01', earned: 50, status: 'active' },
  { id: '2', name: 'Sarah M.', email: 's***@email.com', joinedAt: '2024-11-28', earned: 75, status: 'active' },
  { id: '3', name: 'Mike K.', email: 'm***@email.com', joinedAt: '2024-11-15', earned: 100, status: 'active' },
];

export default function Referral() {
  const [copied, setCopied] = useState(false);
  const referralCode = `GREENBULL-${mockUser.id.toUpperCase()}2024`;
  const referralLink = `https://greenbull.io/signup?ref=${referralCode}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const totalEarned = mockReferrals.reduce((sum, ref) => sum + ref.earned, 0);
  const totalReferrals = mockReferrals.length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Referral Program</h1>
          <p className="text-muted-foreground">Invite friends and earn rewards together</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Referrals</p>
                  <p className="text-2xl font-bold text-foreground">{totalReferrals}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Earned</p>
                  <p className="text-2xl font-bold text-primary">${totalEarned}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Gift className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bonus Per Referral</p>
                  <p className="text-2xl font-bold text-foreground">$50</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referral Link Card */}
        <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              Your Referral Link
            </CardTitle>
            <CardDescription>
              Share this link with friends. You'll earn $50 for each friend who signs up and makes their first deposit!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Referral Code</label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={referralCode}
                  className="bg-secondary border-border font-mono"
                />
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(referralCode)}
                  className="border-border"
                >
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Referral Link</label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={referralLink}
                  className="bg-secondary border-border font-mono text-sm"
                />
                <Button
                  onClick={() => copyToClipboard(referralLink)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Copy Link
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-lg font-bold text-primary">1</span>
                </div>
                <h4 className="font-medium text-foreground mb-1">Share Your Link</h4>
                <p className="text-sm text-muted-foreground">Send your unique referral link to friends</p>
              </div>
              <div className="text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-lg font-bold text-primary">2</span>
                </div>
                <h4 className="font-medium text-foreground mb-1">Friend Signs Up</h4>
                <p className="text-sm text-muted-foreground">They create an account and make a deposit</p>
              </div>
              <div className="text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-lg font-bold text-primary">3</span>
                </div>
                <h4 className="font-medium text-foreground mb-1">You Earn $50</h4>
                <p className="text-sm text-muted-foreground">Bonus credited to your wallet instantly</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referrals List */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Your Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            {mockReferrals.length > 0 ? (
              <div className="space-y-3">
                {mockReferrals.map((referral) => (
                  <div
                    key={referral.id}
                    className="flex items-center justify-between py-4 px-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{referral.name}</p>
                        <p className="text-sm text-muted-foreground">{referral.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                        {referral.status}
                      </Badge>
                      <div className="text-right">
                        <p className="font-semibold text-primary">+${referral.earned}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(referral.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No referrals yet. Share your link to start earning!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
