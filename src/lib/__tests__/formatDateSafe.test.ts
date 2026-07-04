import { describe, it, expect } from 'vitest';
import { format } from 'date-fns';
import { formatDateSafe } from '@/lib/dateUtils';

const fmt = (d: Date) => format(d, 'dd/MM/yyyy');

describe('formatDateSafe', () => {
  it('format วันที่ valid ตามปกติ', () => {
    expect(formatDateSafe('2026-07-04', fmt)).toBe('04/07/2026');
  });

  it('คืน fallback เมื่อค่าว่าง/null/undefined', () => {
    expect(formatDateSafe('', fmt)).toBe('-');
    expect(formatDateSafe(null, fmt)).toBe('-');
    expect(formatDateSafe(undefined, fmt)).toBe('-');
  });

  it('คืน fallback เมื่อ parse ไม่ได้ (เดิม date-fns format จะ throw RangeError)', () => {
    expect(formatDateSafe('not-a-date', fmt)).toBe('-');
    expect(formatDateSafe('0000-00-00', fmt)).toBe('-');
  });

  it('รองรับ fallback ที่กำหนดเอง', () => {
    expect(formatDateSafe('invalid', fmt, 'ไม่ระบุ')).toBe('ไม่ระบุ');
  });
});
