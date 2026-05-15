import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Pencil, Plus, Trash2, Upload, Wallet, X } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

interface WalletAddressItem {
  _id: string;
  currency: string;
  label: string;
  network?: string;
  address: string;
  qrCode?: string;
  enabled: boolean;
  order?: number;
}

const emptyForm = {
  currency: '',
  label: '',
  network: '',
  address: '',
  qrCode: '',
  enabled: true,
  order: 0,
};

export function AdminWalletAddresses() {
  const [items, setItems] = useState<WalletAddressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.adminGetWalletAddresses();
      if (res.success && res.data) setItems(res.data as WalletAddressItem[]);
    } catch (e) {
      toast.error('Failed to load wallet addresses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const openEdit = (item: WalletAddressItem) => {
    setEditingId(item._id);
    setForm({
      currency: item.currency || '',
      label: item.label || '',
      network: item.network || '',
      address: item.address || '',
      qrCode: item.qrCode || '',
      enabled: item.enabled,
      order: item.order || 0,
    });
    setDialogOpen(true);
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      toast.error('QR image must be less than 1.5MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setForm((f) => ({ ...f, qrCode: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.currency.trim() || !form.label.trim() || !form.address.trim()) {
      toast.error('Currency, label and address are required');
      return;
    }
    setSaving(true);
    try {
      const res = editingId
        ? await api.adminUpdateWalletAddress(editingId, form)
        : await api.adminCreateWalletAddress(form);
      if (res.success) {
        toast.success(editingId ? 'Wallet address updated' : 'Wallet address added');
        setDialogOpen(false);
        await fetchItems();
      } else {
        toast.error((res as any).message || res.error || 'Save failed');
      }
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this wallet address?')) return;
    try {
      const res = await api.adminDeleteWalletAddress(id);
      if (res.success) {
        toast.success('Wallet address deleted');
        await fetchItems();
      } else {
        toast.error('Delete failed');
      }
    } catch {
      toast.error('Delete failed');
    }
  };

  const toggleEnabled = async (item: WalletAddressItem) => {
    try {
      const res = await api.adminUpdateWalletAddress(item._id, { enabled: !item.enabled });
      if (res.success) {
        await fetchItems();
      }
    } catch {
      toast.error('Update failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold">Wallet Addresses</h2>
          <p className="text-sm text-muted-foreground">
            Manage crypto wallet addresses and QR codes shown on the user deposit page.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" /> Add Wallet
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Wallet className="h-10 w-10 mx-auto mb-3 opacity-50" />
            No wallet addresses yet. Click "Add Wallet" to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <Card key={item._id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {item.label}
                    <Badge variant={item.enabled ? 'default' : 'secondary'}>
                      {item.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {item.currency}{item.network ? ` · ${item.network}` : ''}
                  </CardDescription>
                </div>
                <Switch checked={item.enabled} onCheckedChange={() => toggleEnabled(item)} />
              </CardHeader>
              <CardContent className="space-y-3">
                {item.qrCode && (
                  <img
                    src={item.qrCode}
                    alt={`${item.label} QR code`}
                    className="h-32 w-32 rounded-md border border-border bg-white p-1 object-contain"
                  />
                )}
                <div className="rounded-md bg-secondary px-3 py-2 font-mono text-xs break-all">
                  {item.address}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(item._id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Wallet Address' : 'Add Wallet Address'}</DialogTitle>
            <DialogDescription>
              These addresses appear on the user Deposit page.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Currency *</Label>
                <Input
                  placeholder="USDT"
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Network</Label>
                <Input
                  placeholder="TRC-20"
                  value={form.network}
                  onChange={(e) => setForm((f) => ({ ...f, network: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Label *</Label>
              <Input
                placeholder="USDT (TRC-20)"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Wallet Address *</Label>
              <Input
                placeholder="TXXXXXXXXXXXXXXXX..."
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label>QR Code Image</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleQrUpload}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                {form.qrCode ? (
                  <div className="space-y-2">
                    <img src={form.qrCode} alt="QR preview" className="h-32 w-32 mx-auto rounded-md bg-white p-1" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setForm((f) => ({ ...f, qrCode: '' }));
                      }}
                    >
                      <X className="h-4 w-4 mr-1" /> Remove QR
                    </Button>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    <Upload className="h-6 w-6 mx-auto mb-2 text-primary" />
                    Click to upload QR code (PNG/JPG, max 1.5MB)
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div className="space-y-1.5">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm((f) => ({ ...f, order: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch
                  checked={form.enabled}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
                />
                <Label>Enabled</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingId ? 'Save Changes' : 'Add Wallet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminWalletAddresses;
