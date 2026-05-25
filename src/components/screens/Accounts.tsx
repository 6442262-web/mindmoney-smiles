import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Wallet, Plus, Settings, Trash2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAccounts, Account } from '@/hooks/useAccounts';
import { useLanguage } from '@/hooks/useLanguage';

const ACCOUNT_COLORS = [
  '#4CAF50', '#2196F3', '#FF9800', '#E91E63', 
  '#9C27B0', '#00BCD4', '#FF5722', '#795548',
  '#607D8B', '#8BC34A', '#FFEB3B', '#F44336'
];

export function Accounts() {
  const { 
    accounts, 
    currentAccount, 
    loading, 
    createAccount, 
    updateAccount, 
    deleteAccount,
    switchAccount 
  } = useAccounts();
  const { t } = useLanguage();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#4CAF50',
    budget_limit: 0,
    is_default: false,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      color: '#4CAF50',
      budget_limit: 0,
      is_default: false,
    });
  };

  const handleCreateAccount = async () => {
    if (!formData.name.trim()) return;

    const result = await createAccount(formData);
    if (result) {
      setIsCreateDialogOpen(false);
      resetForm();
    }
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      color: account.color || '#4CAF50',
      budget_limit: account.budget_limit || 0,
      is_default: account.is_default || false,
    });
  };

  const handleUpdateAccount = async () => {
    if (!editingAccount || !formData.name.trim()) return;

    await updateAccount(editingAccount.id, formData);
    setEditingAccount(null);
    resetForm();
  };

  const handleDeleteAccount = async (accountId: string) => {
    await deleteAccount(accountId);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH').format(amount);
  };

  if (loading) {
    return (
      <div className="pb-20 px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{t('accounts.title')}</h1>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">{t('accounts.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Wallet className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t('accounts.title')}</h1>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary">
              <Plus className="h-4 w-4 mr-2" />
              {t('accounts.add')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('accounts.create')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('accounts.name')}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('accounts.namePlaceholder')}
                />
              </div>

              <div>
                <Label>{t('accounts.color')}</Label>
                <div className="grid grid-cols-6 gap-2 mt-2">
                  {ACCOUNT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color ? 'border-foreground' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                    />
                  ))}
                </div>
              </div>

              <div>
                <Label>{t('accounts.budget')}</Label>
                <Input
                  type="number"
                  value={formData.budget_limit}
                  onChange={(e) => setFormData(prev => ({ ...prev, budget_limit: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>{t('accounts.setDefault')}</Label>
                <Switch
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="flex-1">
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleCreateAccount} className="flex-1 bg-gradient-primary">
                  {t('accounts.createAccount')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Current Account */}
      {currentAccount && (
        <Card className="p-4 mb-6 border-primary/20" style={{ borderColor: currentAccount.color + '40' }}>
          <div className="flex items-center gap-3 mb-2">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: currentAccount.color }}
            />
            <span className="text-sm text-muted-foreground">{t('accounts.currentAccount')}</span>
          </div>
          <h3 className="text-lg font-semibold">{currentAccount.name}</h3>
          {(currentAccount.budget_limit ?? 0) > 0 && (
            <p className="text-sm">
              {t('accounts.budget')}: ฿{formatCurrency(currentAccount.budget_limit)}
            </p>
          )}
        </Card>
      )}

      {/* Accounts List */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{t('accounts.title')} ({accounts.length})</h2>
        
        {accounts.length === 0 ? (
          <Card className="p-8 text-center">
            <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t('accounts.noAccounts')}</p>
          </Card>
        ) : (
          accounts.map((account) => (
            <Card 
              key={account.id} 
              className={`p-4 cursor-pointer transition-colors ${
                currentAccount?.id === account.id ? 'ring-2 ring-primary/20' : ''
              }`}
              onClick={() => switchAccount(account)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: account.color }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{account.name}</h3>
                      {account.is_default && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {t('accounts.default')}
                        </span>
                      )}
                    </div>
                    {(account.budget_limit ?? 0) > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {t('accounts.budget')}: ฿{formatCurrency(account.budget_limit || 0)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditAccount(account);
                    }}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>

                  {accounts.length > 1 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('accounts.delete')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('accounts.deleteConfirm')} "{account.name}"? 
                            {t('accounts.deleteWarning')}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteAccount(account.id)}
                            className="bg-destructive text-destructive-foreground"
                          >
                            {t('accounts.delete')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Edit Account Dialog */}
      <Dialog open={!!editingAccount} onOpenChange={() => setEditingAccount(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('accounts.edit')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('accounts.name')}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('accounts.namePlaceholder')}
              />
            </div>

            <div>
              <Label>{t('accounts.color')}</Label>
              <div className="grid grid-cols-6 gap-2 mt-2">
                {ACCOUNT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === color ? 'border-foreground' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label>{t('accounts.budget')}</Label>
              <Input
                type="number"
                value={formData.budget_limit}
                onChange={(e) => setFormData(prev => ({ ...prev, budget_limit: Number(e.target.value) }))}
                placeholder="0"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>{t('accounts.setDefault')}</Label>
              <Switch
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditingAccount(null)} className="flex-1">
                {t('common.cancel')}
              </Button>
              <Button onClick={handleUpdateAccount} className="flex-1 bg-gradient-primary">
                {t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
