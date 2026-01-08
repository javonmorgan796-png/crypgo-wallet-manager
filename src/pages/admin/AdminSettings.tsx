import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings,
  Database,
  Mail,
  Shield,
  Globe,
  Save,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function AdminSettings() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  // Platform settings
  const [platformName, setPlatformName] = useState('Green Bull');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [kycRequired, setKycRequired] = useState(true);
  const [minDeposit, setMinDeposit] = useState('100');
  const [minWithdrawal, setMinWithdrawal] = useState('50');

  // Email settings
  const [mailtrapApiToken, setMailtrapApiToken] = useState('********');
  const [senderEmail, setSenderEmail] = useState('noreply@greenbull.com');
  const [senderName, setSenderName] = useState('Green Bull');

  // Security settings
  const [require2FA, setRequire2FA] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [maxLoginAttempts, setMaxLoginAttempts] = useState('5');

  const handleSave = async (section: string) => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    
    toast({
      title: "Settings Saved",
      description: `${section} settings have been updated successfully`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Platform Settings</h2>
        <p className="text-muted-foreground">Configure platform-wide settings and preferences</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">
            <Globe className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="h-4 w-4 mr-2" />
            Email (Mailtrap)
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="database">
            <Database className="h-4 w-4 mr-2" />
            Database
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure basic platform settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="platformName">Platform Name</Label>
                  <Input
                    id="platformName"
                    value={platformName}
                    onChange={(e) => setPlatformName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minDeposit">Minimum Deposit ($)</Label>
                  <Input
                    id="minDeposit"
                    type="number"
                    value={minDeposit}
                    onChange={(e) => setMinDeposit(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minWithdrawal">Minimum Withdrawal ($)</Label>
                  <Input
                    id="minWithdrawal"
                    type="number"
                    value={minWithdrawal}
                    onChange={(e) => setMinWithdrawal(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Disable access to the platform for maintenance
                    </p>
                  </div>
                  <Switch 
                    checked={maintenanceMode} 
                    onCheckedChange={setMaintenanceMode}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>User Registration</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow new users to register
                    </p>
                  </div>
                  <Switch 
                    checked={registrationEnabled} 
                    onCheckedChange={setRegistrationEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require KYC for Withdrawals</Label>
                    <p className="text-sm text-muted-foreground">
                      Users must complete KYC before withdrawing
                    </p>
                  </div>
                  <Switch 
                    checked={kycRequired} 
                    onCheckedChange={setKycRequired}
                  />
                </div>
              </div>

              <Button onClick={() => handleSave('General')} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Mailtrap Configuration</CardTitle>
              <CardDescription>
                Configure email notifications using Mailtrap
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-500">
                  <strong>Note:</strong> Your Mailtrap API token is stored securely. 
                  The token shown below is masked for security.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="mailtrapToken">Mailtrap API Token</Label>
                  <Input
                    id="mailtrapToken"
                    type="password"
                    value={mailtrapApiToken}
                    onChange={(e) => setMailtrapApiToken(e.target.value)}
                    placeholder="Enter new token to update..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank to keep existing token
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senderEmail">Sender Email</Label>
                  <Input
                    id="senderEmail"
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senderName">Sender Name</Label>
                  <Input
                    id="senderName"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium">Email Notifications</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm">Welcome Email</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm">Deposit Confirmation</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm">Withdrawal Confirmation</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm">KYC Status Updates</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm">Security Alerts</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm">Promotional Emails</span>
                    <Switch />
                  </div>
                </div>
              </div>

              <Button onClick={() => handleSave('Email')} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Configure platform security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                  <Input
                    id="maxLoginAttempts"
                    type="number"
                    value={maxLoginAttempts}
                    onChange={(e) => setMaxLoginAttempts(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require 2FA for All Users</Label>
                    <p className="text-sm text-muted-foreground">
                      Force all users to enable two-factor authentication
                    </p>
                  </div>
                  <Switch 
                    checked={require2FA} 
                    onCheckedChange={setRequire2FA}
                  />
                </div>
              </div>

              <Button onClick={() => handleSave('Security')} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Settings */}
        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle>MongoDB Configuration</CardTitle>
              <CardDescription>
                Your MongoDB database connection settings (configured on Render.com)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-500">
                  <strong>Important:</strong> Database connection settings should be configured 
                  in your Render.com environment variables for security.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Connection Status</p>
                      <p className="text-sm text-muted-foreground">MongoDB Atlas</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-yellow-500" />
                      <span className="text-sm text-yellow-500">Not Connected</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg space-y-3">
                  <p className="font-medium">Required Environment Variables</p>
                  <p className="text-sm text-muted-foreground">
                    Set these in your Render.com dashboard:
                  </p>
                  <ul className="text-sm space-y-2 font-mono">
                    <li className="p-2 bg-muted rounded">MONGODB_URI</li>
                    <li className="p-2 bg-muted rounded">JWT_SECRET</li>
                    <li className="p-2 bg-muted rounded">MAILTRAP_API_TOKEN</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
