import jsQR from "jsqr";

// ถอดและตีความ QR บนสลิปโอนเงินธนาคารไทย (มาตรฐานตรวจสอบสลิป)
// payload เป็น TLV: แท็ก 2 หลัก + ความยาว 2 หลัก + ค่า โดยแท็ก "00" ชั้นนอก
// ห่อข้อมูลย่อย: 00 = API ID, 01 = รหัสธนาคารต้นทาง, 02 = เลขอ้างอิงธุรกรรม

export interface SlipQrInfo {
  found: boolean;
  rawData?: string;
  transRef?: string;
  sendingBankCode?: string;
  sendingBankName?: string;
}

const BANK_NAMES: Record<string, string> = {
  "002": "กรุงเทพ",
  "004": "กสิกรไทย",
  "006": "กรุงไทย",
  "011": "ทหารไทยธนชาต (ttb)",
  "014": "ไทยพาณิชย์",
  "022": "ซีไอเอ็มบี",
  "024": "ยูโอบี",
  "025": "กรุงศรีอยุธยา",
  "030": "ออมสิน",
  "033": "อาคารสงเคราะห์",
  "034": "ธ.ก.ส.",
  "067": "ทิสโก้",
  "069": "เกียรตินาคินภัทร",
  "073": "แลนด์ แอนด์ เฮ้าส์",
};

/** แตก TLV หนึ่งชั้น: "00xxYYY..." → { '00': 'YYY', ... } — คืน null ถ้ารูปแบบไม่ถูกต้อง */
export function parseTlv(data: string): Record<string, string> | null {
  const out: Record<string, string> = {};
  let i = 0;
  while (i + 4 <= data.length) {
    const tag = data.slice(i, i + 2);
    const len = Number(data.slice(i + 2, i + 4));
    if (!/^\d{2}$/.test(tag) || Number.isNaN(len) || i + 4 + len > data.length) return null;
    out[tag] = data.slice(i + 4, i + 4 + len);
    i += 4 + len;
  }
  return i === data.length && Object.keys(out).length > 0 ? out : null;
}

/** ตีความ payload ของ QR สลิปธนาคาร — คืนข้อมูลเท่าที่แกะได้ */
export function parseSlipQrPayload(rawData: string): SlipQrInfo {
  const info: SlipQrInfo = { found: true, rawData };
  const outer = parseTlv(rawData);
  const envelope = outer?.["00"];
  if (envelope) {
    const inner = parseTlv(envelope);
    if (inner) {
      info.sendingBankCode = inner["01"];
      info.transRef = inner["02"];
      if (info.sendingBankCode) {
        info.sendingBankName = BANK_NAMES[info.sendingBankCode.padStart(3, "0").slice(-3)];
      }
    }
  }
  return info;
}

/** ถอด QR จากรูป base64 (data URL) ใน browser — คืน { found: false } เมื่อไม่พบ QR */
export async function decodeSlipQr(imageBase64: string): Promise<SlipQrInfo> {
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image load failed"));
      img.src = imageBase64;
    });

    // ลองหลายขนาด — QR บนสลิปมักเล็ก การย่อ/ขยายช่วยให้เจอง่ายขึ้น
    for (const scale of [1, 1.5, 0.75]) {
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      if (w < 50 || h < 50 || w * h > 16_000_000) continue;

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const code = jsQR(imageData.data, w, h);
      if (code?.data) return parseSlipQrPayload(code.data);
    }
    return { found: false };
  } catch (e) {
    console.error("decodeSlipQr error:", e);
    return { found: false };
  }
}
