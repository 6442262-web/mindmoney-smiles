/**
 * Centralized validation utilities for the MoneyMind app.
 * Used across all forms for consistent validation behavior.
 */

/** Validate that amount is a positive number within limits */
export function isValidAmount(value: string): boolean {
  if (!value) return false;
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0 || num > 999999999) return false;
  return true;
}

/** Sanitize text input - strip HTML tags to prevent XSS */
export function sanitizeText(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim();
}

/** Clamp and validate amount input for onChange handlers */
export function clampAmountInput(val: string): string | null {
  if (val === '') return '';
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
