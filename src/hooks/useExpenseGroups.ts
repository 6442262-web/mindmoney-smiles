import { useCallback, useState } from 'react';

export interface ExpenseGroup {
  id: string;
  name: string;
  // คำที่ใช้จับกลุ่มจาก description (contains, case-insensitive) — v1 มีค่าเดียวคือชื่อกลุ่ม
  keywords: string[];
}

const STORAGE_KEY = 'expense-groups';
const MAX_NAME_LENGTH = 50;

function loadGroups(): ExpenseGroup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((g): g is ExpenseGroup =>
        !!g && typeof g.id === 'string' && typeof g.name === 'string'
      )
      .map(g => ({
        ...g,
        keywords: Array.isArray(g.keywords) && g.keywords.length > 0 ? g.keywords : [g.name],
      }));
  } catch {
    return [];
  }
}

export function useExpenseGroups() {
  const [groups, setGroups] = useState<ExpenseGroup[]>(loadGroups);

  const persist = (next: ExpenseGroup[]) => {
    setGroups(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage เต็ม/ใช้ไม่ได้ — state ใน memory ยังใช้ต่อได้ใน session นี้
    }
  };

  // คืน false เมื่อชื่อว่าง ยาวเกิน หรือซ้ำกับกลุ่มเดิม (ไม่สนตัวพิมพ์)
  const addGroup = useCallback((name: string): boolean => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > MAX_NAME_LENGTH) return false;
    if (groups.some(g => g.name.toLowerCase() === trimmed.toLowerCase())) return false;
    persist([...groups, { id: crypto.randomUUID(), name: trimmed, keywords: [trimmed] }]);
    return true;
  }, [groups]);

  const removeGroup = useCallback((id: string) => {
    persist(groups.filter(g => g.id !== id));
  }, [groups]);

  return { groups, addGroup, removeGroup };
}
