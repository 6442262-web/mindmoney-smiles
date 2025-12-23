// Hash PIN securely using Web Crypto API (browser-compatible)
export const hashPin = async (pin: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Verify PIN against stored hash
export const verifyPin = async (pin: string, hash: string): Promise<boolean> => {
  const pinHash = await hashPin(pin);
  return pinHash === hash;
};

// Store PIN in localStorage temporarily (session-based)
export const storePinSession = (): void => {
  localStorage.setItem('pin_verified', Date.now().toString());
};

// Check if PIN session is valid (expires after 30 minutes)
export const isPinSessionValid = (): boolean => {
  const stored = localStorage.getItem('pin_verified');
  if (!stored) return false;
  
  const timestamp = parseInt(stored);
  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds
  
  return (now - timestamp) < thirtyMinutes;
};

// Clear PIN session
export const clearPinSession = (): void => {
  localStorage.removeItem('pin_verified');
};

// Validate PIN format (6 digits)
export const isValidPinFormat = (pin: string): boolean => {
  return /^\d{6}$/.test(pin);
};