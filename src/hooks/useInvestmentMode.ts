import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'investment-mode';
const CHANGE_EVENT = 'investment-mode-changed';

function readInvestmentMode(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

// สถานะเปิด/ปิดโหมดการลงทุน — ใช้ร่วมกันทั้ง Settings (สวิตช์), Dashboard (ปุ่มลัด), และ route guard
// ยิง custom event ตอนเปลี่ยนค่า เพื่อให้ component ที่ mount ค้างอยู่ (เช่น AppContent) อัปเดตทันทีไม่ต้อง reload
export function useInvestmentMode() {
  const [investmentMode, setState] = useState(readInvestmentMode);

  useEffect(() => {
    const handler = () => setState(readInvestmentMode());
    window.addEventListener(CHANGE_EVENT, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(CHANGE_EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const setInvestmentMode = useCallback((enabled: boolean) => {
    localStorage.setItem(STORAGE_KEY, String(enabled));
    setState(enabled);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { investmentMode, setInvestmentMode };
}
