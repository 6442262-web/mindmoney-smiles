import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown, Wallet, Check } from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';

interface AccountSelectorProps {
  className?: string;
}

export function AccountSelector({ className }: AccountSelectorProps) {
  const { accounts, currentAccount, switchAccount } = useAccounts();
  const [open, setOpen] = useState(false);

  if (!currentAccount) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`justify-between ${className}`}>
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: currentAccount.color }}
            />
            <span className="truncate">{currentAccount.name}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <div className="p-2">
          <div className="text-sm font-medium text-muted-foreground mb-2 px-2">
            เลือกบัญชี
          </div>
          <div className="space-y-1">
            {accounts.map((account) => (
              <Button
                key={account.id}
                variant="ghost"
                className="w-full justify-start h-auto p-2"
                onClick={() => {
                  switchAccount(account);
                  setOpen(false);
                }}
              >
                <div className="flex items-center gap-3 w-full">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: account.color }}
                  />
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{account.name}</span>
                      {account.is_default && (
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          หลัก
                        </span>
                      )}
                    </div>
                    {account.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {account.description}
                      </p>
                    )}
                  </div>
                  {currentAccount.id === account.id && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </div>
              </Button>
            ))}
          </div>
          <div className="border-t pt-2 mt-2">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                setOpen(false);
                // Navigate to accounts page - will be handled by the parent component
                window.location.href = '/accounts';
              }}
            >
              <Wallet className="h-4 w-4 mr-2" />
              จัดการบัญชี
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}