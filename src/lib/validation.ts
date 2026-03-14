/**
 * Centralized validation utilities for the MoneyMind app.
 * Used across all forms for consistent validation behavior.
 */

/** Validate that amount is a positive number within limits */
export function isValidAmount(value: string): boolean {
  if (!value || value.trim() === '') return false;
  // Strict numeric check: only digits, optional dot, optional leading sign
  if (!/^\d+(\.\d+)?(e\d+)?$/i.test(value.trim())) return false;
  const num = parseFloat(value);
  if (isNaN(num) || !isFinite(num) || num <= 0 || num > 999999999) return false;
  return true;
}

/** Sanitize text input - strip HTML tags to prevent XSS */
export function sanitizeText(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim();
}

/** Clamp and validate amount input for onChange handlers */
export function clampAmountInput(val: string): string | null {
  if (val === '') return '';
  // Reject if it contains non-numeric chars (except dot and leading minus for detection)
  const num = Number(val);
  if (isNaN(num) || num < 0 || num > 999999999) return null;
  return val;
}

/** Format large numbers for display without breaking layout */
export function formatAmount(amount: number, currency: string = '฿'): string {
  return `${currency}${amount.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/** Validate description length */
export function isValidDescription(value: string, maxLength: number = 500): boolean {
  const sanitized = sanitizeText(value);
  return sanitized.length <= maxLength;
}

/** Sanitize and validate a form field, returning sanitized value or null if invalid */
export function validateTextField(value: string, maxLength: number = 500): string | null {
  const sanitized = sanitizeText(value);
  if (sanitized.length > maxLength) return null;
  return sanitized;
}

/** Validate amount for form submission — returns error message or null */
export function getAmountError(value: string, fieldName: string = 'จำนวนเงิน'): string | null {
  if (!value || value.trim() === '') return `กรุณากรอก${fieldName}`;
  const num = parseFloat(value);
  if (isNaN(num) || !isFinite(num)) return `${fieldName}ต้องเป็นตัวเลขเท่านั้น`;
  if (num <= 0) return `${fieldName}ต้องมากกว่า 0`;
  if (num > 999999999) return `${fieldName}ต้องไม่เกิน 999,999,999`;
  return null;
}

/** Prevent double-submit by wrapping an async handler */
export function createSubmitGuard() {
  let submitting = false;
  return {
    get isSubmitting() { return submitting; },
    async run<T>(fn: () => Promise<T>): Promise<T | null> {
      if (submitting) return null;
      submitting = true;
      try {
        return await fn();
      } finally {
        submitting = false;
      }
    }
  };
}
