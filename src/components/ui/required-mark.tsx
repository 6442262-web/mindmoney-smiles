// เครื่องหมายบอกช่องบังคับ ใช้ติดท้าย Label ทุกฟอร์มให้เป็นแบบเดียวกัน
export function RequiredMark() {
  return (
    <span className="text-destructive ml-0.5" aria-hidden="true">
      *
    </span>
  );
}
