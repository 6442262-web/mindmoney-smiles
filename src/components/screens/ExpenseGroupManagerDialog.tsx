import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ExpenseGroup } from "@/hooks/useExpenseGroups";
import { GroupedFrequentExpenses } from "@/hooks/useFrequentExpenses";

interface ExpenseGroupManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: ExpenseGroup[];
  matchedGroups: GroupedFrequentExpenses[];
  addGroup: (name: string) => boolean;
  removeGroup: (id: string) => void;
  language: string;
}

export function ExpenseGroupManagerDialog({
  open, onOpenChange, groups, matchedGroups, addGroup, removeGroup, language,
}: ExpenseGroupManagerDialogProps) {
  const [newGroupName, setNewGroupName] = useState("");
  const { toast } = useToast();
  const th = language === 'th';

  const handleAddGroup = () => {
    if (addGroup(newGroupName)) {
      setNewGroupName("");
    } else {
      toast({
        title: th ? 'เพิ่มกลุ่มไม่ได้' : 'Cannot add group',
        description: th ? 'ชื่อกลุ่มว่างหรือซ้ำกับกลุ่มที่มีอยู่' : 'Name is empty or already exists',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setNewGroupName(""); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{th ? 'จัดการกลุ่มรายจ่าย' : 'Manage expense groups'}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          {th
            ? 'รายการที่มีชื่อกลุ่มอยู่ในรายละเอียดจะถูกรวมเป็นกลุ่มเดียวกัน เช่น กลุ่ม "กาแฟ" จะรวม "กาแฟ Amazon" และ "กาแฟ Starbucks"'
            : 'Expenses whose description contains the group name are shown together, e.g. group "Coffee" collects "Coffee Amazon" and "Coffee Starbucks".'}
        </p>
        <div className="flex gap-2">
          <Input
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            placeholder={th ? 'ชื่อกลุ่ม เช่น กาแฟ' : 'Group name, e.g. Coffee'}
            maxLength={50}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddGroup();
              }
            }}
          />
          <Button type="button" size="icon" onClick={handleAddGroup} disabled={!newGroupName.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {groups.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              {th ? 'ยังไม่มีกลุ่ม' : 'No groups yet'}
            </p>
          )}
          {groups.map(g => {
            const match = matchedGroups.find(x => x.id === g.id);
            return (
              <div key={g.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <span className="text-sm font-medium">{g.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {match
                      ? (th
                          ? `${match.variants.length} รายการ · ${match.totalCount} ครั้ง`
                          : `${match.variants.length} items · ${match.totalCount}x`)
                      : (th ? 'ยังไม่มีรายการที่ตรงกัน' : 'No matching expenses yet')}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => removeGroup(g.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
