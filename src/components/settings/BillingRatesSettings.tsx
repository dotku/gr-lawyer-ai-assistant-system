'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Plus,
  Edit2,
  Trash2,
  User,
  Users,
  Building2,
  DollarSign,
  Search,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BillingRate,
  BillingRateType,
  getBillingRates,
  saveBillingRate,
  updateBillingRate,
  deleteBillingRate,
} from '@/lib/supabase';

const typeIcons: Record<BillingRateType, React.ReactNode> = {
  lawyer: <User className="h-4 w-4" />,
  assistant: <Users className="h-4 w-4" />,
  vendor: <Building2 className="h-4 w-4" />,
};

const typeLabels: Record<BillingRateType, string> = {
  lawyer: 'Lawyer',
  assistant: 'Assistant',
  vendor: 'Vendor',
};

const currencies = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (\u20ac)' },
  { value: 'GBP', label: 'GBP (\u00a3)' },
  { value: 'CAD', label: 'CAD ($)' },
  { value: 'AUD', label: 'AUD ($)' },
  { value: 'CNY', label: 'CNY (\u00a5)' },
];

interface RateFormData {
  name: string;
  type: BillingRateType;
  hourlyRate: string;
  currency: string;
  email: string;
  phone: string;
  notes: string;
  isActive: boolean;
}

const emptyFormData: RateFormData = {
  name: '',
  type: 'lawyer',
  hourlyRate: '',
  currency: 'USD',
  email: '',
  phone: '',
  notes: '',
  isActive: true,
};

export function BillingRatesSettings() {
  const t = useTranslations('settings');
  const [rates, setRates] = useState<BillingRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<BillingRateType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<BillingRate | null>(null);
  const [formData, setFormData] = useState<RateFormData>(emptyFormData);
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadRates = useCallback(() => {
    setIsLoading(true);
    // Small delay to ensure localStorage is available
    setTimeout(() => {
      const loadedRates = getBillingRates();
      setRates(loadedRates);
      setIsLoading(false);
    }, 100);
  }, []);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  const filteredRates = rates.filter((rate) => {
    const matchesTab = activeTab === 'all' || rate.type === activeTab;
    const matchesSearch =
      searchQuery === '' ||
      rate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rate.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleOpenDialog = (rate?: BillingRate) => {
    if (rate) {
      setEditingRate(rate);
      setFormData({
        name: rate.name,
        type: rate.type,
        hourlyRate: rate.hourlyRate.toString(),
        currency: rate.currency,
        email: rate.email || '',
        phone: rate.phone || '',
        notes: rate.notes || '',
        isActive: rate.isActive,
      });
    } else {
      setEditingRate(null);
      setFormData(emptyFormData);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingRate(null);
    setFormData(emptyFormData);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.hourlyRate) return;

    setIsSaving(true);
    try {
      const rateData = {
        name: formData.name.trim(),
        type: formData.type,
        hourlyRate: parseFloat(formData.hourlyRate) || 0,
        currency: formData.currency,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        isActive: formData.isActive,
      };

      if (editingRate) {
        updateBillingRate(editingRate.id, rateData);
      } else {
        saveBillingRate(rateData);
      }

      loadRates();
      handleCloseDialog();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      deleteBillingRate(id);
      loadRates();
      setDeleteConfirmId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getStats = () => {
    const stats = {
      total: rates.length,
      lawyers: rates.filter((r) => r.type === 'lawyer').length,
      assistants: rates.filter((r) => r.type === 'assistant').length,
      vendors: rates.filter((r) => r.type === 'vendor').length,
      active: rates.filter((r) => r.isActive).length,
    };
    return stats;
  };

  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('billingRates.totalRates')}</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('billingRates.lawyers')}</p>
                <p className="text-2xl font-bold">{stats.lawyers}</p>
              </div>
              <User className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('billingRates.assistants')}</p>
                <p className="text-2xl font-bold">{stats.assistants}</p>
              </div>
              <Users className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('billingRates.vendors')}</p>
                <p className="text-2xl font-bold">{stats.vendors}</p>
              </div>
              <Building2 className="h-8 w-8 text-purple-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {t('billingRates.title')}
          </CardTitle>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('billingRates.addRate')}
          </Button>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('billingRates.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BillingRateType | 'all')}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">{t('billingRates.all')}</TabsTrigger>
              <TabsTrigger value="lawyer" className="gap-2">
                <User className="h-3 w-3" />
                {t('billingRates.lawyers')}
              </TabsTrigger>
              <TabsTrigger value="assistant" className="gap-2">
                <Users className="h-3 w-3" />
                {t('billingRates.assistants')}
              </TabsTrigger>
              <TabsTrigger value="vendor" className="gap-2">
                <Building2 className="h-3 w-3" />
                {t('billingRates.vendors')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredRates.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? t('billingRates.noSearchResults')
                      : t('billingRates.noRates')}
                  </p>
                  {!searchQuery && (
                    <Button variant="outline" className="mt-4" onClick={() => handleOpenDialog()}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('billingRates.addFirst')}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRates.map((rate) => (
                    <div
                      key={rate.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        rate.isActive
                          ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                          : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-2 rounded-full ${
                            rate.type === 'lawyer'
                              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                              : rate.type === 'assistant'
                              ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                              : 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400'
                          }`}
                        >
                          {typeIcons[rate.type]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {rate.name}
                            </h3>
                            {!rate.isActive && (
                              <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                                {t('billingRates.inactive')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>{typeLabels[rate.type]}</span>
                            {rate.email && (
                              <>
                                <span className="text-gray-300 dark:text-gray-600">|</span>
                                <span>{rate.email}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(rate.hourlyRate, rate.currency)}
                          </p>
                          <p className="text-xs text-muted-foreground">{t('billingRates.perHour')}</p>
                        </div>

                        {deleteConfirmId === rate.id ? (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(rate.id)}
                              disabled={isDeleting}
                            >
                              {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteConfirmId(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(rate)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirmId(rate.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingRate
                ? t('billingRates.editRate')
                : t('billingRates.addRate')}
            </DialogTitle>
            <DialogDescription>
              {editingRate
                ? t('billingRates.editDescription')
                : t('billingRates.addDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">{t('billingRates.form.name')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Smith"
                />
              </div>

              <div>
                <Label htmlFor="type">{t('billingRates.form.type')}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v as BillingRateType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lawyer">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {t('billingRates.lawyers')}
                      </div>
                    </SelectItem>
                    <SelectItem value="assistant">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {t('billingRates.assistants')}
                      </div>
                    </SelectItem>
                    <SelectItem value="vendor">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {t('billingRates.vendors')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('billingRates.form.status')}</Label>
                <Select
                  value={formData.isActive ? 'active' : 'inactive'}
                  onValueChange={(v) => setFormData({ ...formData, isActive: v === 'active' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('billingRates.active')}</SelectItem>
                    <SelectItem value="inactive">{t('billingRates.inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="hourlyRate">{t('billingRates.form.hourlyRate')}</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                  placeholder="150.00"
                />
              </div>

              <div>
                <Label htmlFor="currency">{t('billingRates.form.currency')}</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(v) => setFormData({ ...formData, currency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label htmlFor="email">{t('billingRates.form.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@lawfirm.com"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="phone">{t('billingRates.form.phone')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="notes">{t('billingRates.form.notes')}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              {t('billingRates.form.cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !formData.name.trim() || !formData.hourlyRate}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {editingRate ? t('billingRates.form.save') : t('billingRates.form.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
