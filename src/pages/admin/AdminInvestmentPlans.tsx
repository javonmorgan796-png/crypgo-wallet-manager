import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2, 
  DollarSign,
  Clock,
  Percent,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';

interface InvestmentPlan {
  _id: string;
  name: string;
  type: 'fixed' | 'time-based';
  minAmount: number;
  maxAmount: number;
  roi: number;
  duration: number;
  description: string;
  features: string[];
  popular: boolean;
  isActive: boolean;
  createdAt: string;
}

interface PlanFormData {
  name: string;
  type: 'fixed' | 'time-based';
  minAmount: number;
  maxAmount: number;
  roi: number;
  duration: number;
  description: string;
  features: string[];
  popular: boolean;
  isActive: boolean;
}

const emptyPlan: PlanFormData = {
  name: '',
  type: 'fixed',
  minAmount: 100,
  maxAmount: 10000,
  roi: 10,
  duration: 30,
  description: '',
  features: [''],
  popular: false,
  isActive: true
};

export function AdminInvestmentPlans() {
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<InvestmentPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<InvestmentPlan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(emptyPlan);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const result = await api.adminGetInvestmentPlans();
      if (result.success && result.data) {
        setPlans(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      toast.error('Failed to load investment plans');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openCreateDialog = () => {
    setEditingPlan(null);
    setFormData(emptyPlan);
    setDialogOpen(true);
  };

  const openEditDialog = (plan: InvestmentPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      type: plan.type,
      minAmount: plan.minAmount,
      maxAmount: plan.maxAmount,
      roi: plan.roi,
      duration: plan.duration,
      description: plan.description,
      features: plan.features.length > 0 ? plan.features : [''],
      popular: plan.popular,
      isActive: plan.isActive
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (plan: InvestmentPlan) => {
    setPlanToDelete(plan);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || formData.minAmount <= 0 || formData.roi <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        features: formData.features.filter(f => f.trim() !== '')
      };

      let result;
      if (editingPlan) {
        result = await api.adminUpdateInvestmentPlan(editingPlan._id, payload);
      } else {
        result = await api.adminCreateInvestmentPlan(payload);
      }

      if (result.success) {
        toast.success(editingPlan ? 'Plan updated successfully' : 'Plan created successfully');
        setDialogOpen(false);
        fetchPlans();
      } else {
        toast.error(result.error || 'Failed to save plan');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save plan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!planToDelete) return;

    setIsDeleting(true);
    try {
      const result = await api.adminDeleteInvestmentPlan(planToDelete._id);
      if (result.success) {
        toast.success('Plan deleted successfully');
        setDeleteDialogOpen(false);
        setPlanToDelete(null);
        fetchPlans();
      } else {
        toast.error(result.error || 'Failed to delete plan');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete plan');
    } finally {
      setIsDeleting(false);
    }
  };

  const addFeature = () => {
    setFormData(prev => ({
      ...prev,
      features: [...prev.features, '']
    }));
  };

  const updateFeature = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.map((f, i) => i === index ? value : f)
    }));
  };

  const removeFeature = (index: number) => {
    if (formData.features.length === 1) return;
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Investment Plans</h2>
          <p className="text-muted-foreground">Create and manage investment plans for users</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Create Plan
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No Investment Plans</p>
            <p className="text-muted-foreground mb-4">Create your first investment plan to get started</p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan._id} className={`relative ${!plan.isActive ? 'opacity-60' : ''}`}>
              {plan.popular && (
                <Badge className="absolute -top-2 right-4 bg-primary">Popular</Badge>
              )}
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <CardDescription>{plan.type === 'fixed' ? 'Fixed Tier' : 'Time-Based'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>${plan.minAmount.toLocaleString()} - ${plan.maxAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-primary">{plan.roi}% ROI</span>
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{plan.duration} days</span>
                  </div>
                </div>

                {plan.description && (
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                )}

                {plan.features.length > 0 && (
                  <div className="space-y-1">
                    {plan.features.slice(0, 3).map((feature, index) => (
                      <div key={index} className="text-xs text-muted-foreground">• {feature}</div>
                    ))}
                    {plan.features.length > 3 && (
                      <div className="text-xs text-muted-foreground">+{plan.features.length - 3} more</div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(plan)}>
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => openDeleteDialog(plan)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Edit Investment Plan' : 'Create Investment Plan'}</DialogTitle>
            <DialogDescription>
              {editingPlan ? 'Update the investment plan details' : 'Add a new investment plan for users'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Plan Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Gold Plan"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Plan Type *</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value: 'fixed' | 'time-based') => setFormData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Tier</SelectItem>
                    <SelectItem value="time-based">Time-Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minAmount">Minimum Amount ($) *</Label>
                <Input
                  id="minAmount"
                  type="number"
                  value={formData.minAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, minAmount: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxAmount">Maximum Amount ($) *</Label>
                <Input
                  id="maxAmount"
                  type="number"
                  value={formData.maxAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxAmount: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="roi">ROI (%) *</Label>
                <Input
                  id="roi"
                  type="number"
                  value={formData.roi}
                  onChange={(e) => setFormData(prev => ({ ...prev, roi: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (days) *</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the plan..."
              />
            </div>

            <div className="space-y-2">
              <Label>Features</Label>
              <div className="space-y-2">
                {formData.features.map((feature, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={feature}
                      onChange={(e) => updateFeature(index, e.target.value)}
                      placeholder={`Feature ${index + 1}`}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={() => removeFeature(index)}
                      disabled={formData.features.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addFeature}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Feature
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="popular"
                  checked={formData.popular}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, popular: checked }))}
                />
                <Label htmlFor="popular">Mark as Popular</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingPlan ? 'Update Plan' : 'Create Plan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Investment Plan
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{planToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="flex-1">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete Plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
