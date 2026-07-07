import { describe, it, expect } from 'vitest';
import { parseTlv, parseSlipQrPayload } from '@/lib/slipQr';

// สร้าง payload สังเคราะห์ตามโครง TLV ของ QR สลิปธนาคาร
function tlv(tag: string, value: string) {
  return tag + String(value.length).padStart(2, '0') + value;
}

describe('parseTlv', () => {
  it('แตกฟิลด์ TLV ปกติได้ครบ', () => {
    const data = tlv('00', 'ABC') + tlv('51', 'TH');
    expect(parseTlv(data)).toEqual({ '00': 'ABC', '51': 'TH' });
  });

  it('ข้อมูลไม่ครบ/ความยาวเกินจริง → null', () => {
    expect(parseTlv('0099X')).toBeNull();
    expect(parseTlv('xx03abc')).toBeNull();
    expect(parseTlv('')).toBeNull();
  });
});

describe('parseSlipQrPayload', () => {
  it('แกะรหัสธนาคารและเลขอ้างอิงจาก envelope ชั้นใน', () => {
    const inner = tlv('00', '000001') + tlv('01', '004') + tlv('02', 'AB12345678');
    const payload = tlv('00', inner) + tlv('51', 'TH');
    const info = parseSlipQrPayload(payload);

    expect(info.found).toBe(true);
    expect(info.sendingBankCode).toBe('004');
    expect(info.sendingBankName).toBe('กสิกรไทย');
    expect(info.transRef).toBe('AB12345678');
  });

  it('payload แปลก ๆ (เช่น QR อื่นที่ไม่ใช่สลิป) → found=true แต่ไม่มีข้อมูลย่อย ไม่ crash', () => {
    const info = parseSlipQrPayload('https://example.com/whatever');
    expect(info.found).toBe(true);
    expect(info.transRef).toBeUndefined();
    expect(info.rawData).toBe('https://example.com/whatever');
  });

  it('รหัสธนาคารที่ไม่รู้จัก → มี code แต่ไม่มีชื่อ', () => {
    const inner = tlv('00', '000001') + tlv('01', '999') + tlv('02', 'REF001');
    const info = parseSlipQrPayload(tlv('00', inner));
    expect(info.sendingBankCode).toBe('999');
    expect(info.sendingBankName).toBeUndefined();
  });
});
