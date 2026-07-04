import { describe, it, expect } from 'vitest';
import { getMonthlyAmount } from '@/lib/recurringUtils';

describe('getMonthlyAmount', () => {
  it('daily คูณ 30', () => {
    expect(getMonthlyAmount(100, 'daily')).toBe(3000);
  });

  it('weekly คูณ 4', () => {
    expect(getMonthlyAmount(500, 'weekly')).toBe(2000);
  });

  it('monthly คงเดิม', () => {
    expect(getMonthlyAmount(1500, 'monthly')).toBe(1500);
  });

  it('frequency ที่ไม่รู้จักคงเดิม', () => {
    expect(getMonthlyAmount(1000, 'yearly')).toBe(1000);
    expect(getMonthlyAmount(1000, '')).toBe(1000);
  });
});
