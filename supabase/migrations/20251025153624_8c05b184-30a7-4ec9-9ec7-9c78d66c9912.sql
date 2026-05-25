-- เพิ่มฟิลด์สำหรับบัตรเครดิต
ALTER TABLE public.liabilities
ADD COLUMN credit_limit numeric,
ADD COLUMN min_payment numeric,
ADD COLUMN billing_cycle_day integer,
ADD COLUMN payment_due_day integer,
ADD COLUMN statement_date date;

-- เพิ่ม comment อธิบายการใช้งานฟิลด์
COMMENT ON COLUMN public.liabilities.credit_limit IS 'วงเงินบัตรเครดิต (ใช้กับประเภท credit_card)';
COMMENT ON COLUMN public.liabilities.min_payment IS 'ยอดชำระขั้นต่ำรายเดือน';
COMMENT ON COLUMN public.liabilities.billing_cycle_day IS 'วันที่ปิดบิล (1-31)';
COMMENT ON COLUMN public.liabilities.payment_due_day IS 'วันที่ครบกำหนดชำระ (1-31)';
COMMENT ON COLUMN public.liabilities.statement_date IS 'วันที่ออกใบแจ้งหนี้ล่าสุด';