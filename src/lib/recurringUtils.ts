/**
 * แปลงยอดรายการประจำเป็นยอดต่อเดือนตาม frequency
 * ใช้ร่วมกันทั้ง Dashboard, Summary, RecurringTransactions เพื่อให้ตัวเลขตรงกันทุกหน้า
 */
export function getMonthlyAmount(amount: number, frequency: string): number {
  switch (frequency) {
    case "daily":
      return amount * 30;
    case "weekly":
      return amount * 4;
    case "monthly":
    default:
      return amount;
  }
}
