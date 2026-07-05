const MIN_LENGTH = 8;
const BLOCKLIST = new Set([
  'password', 'passw0rd', 'password1', '12345678', '123456789', 'qwerty123',
  'left2serve', 'left2serve123', 'welcome123', 'letmein', 'iloveyou', 'admin123',
]);

export function validatePassword(password) {
  const pw = String(password || '');
  if (pw.length < MIN_LENGTH) return { ok: false, error: `Password must be at least ${MIN_LENGTH} characters` };
  if (pw.length > 128) return { ok: false, error: 'Password is too long' };
  let classes = 0;
  if (/[a-z]/.test(pw)) classes++;
  if (/[A-Z]/.test(pw)) classes++;
  if (/[0-9]/.test(pw)) classes++;
  if (/[^A-Za-z0-9]/.test(pw)) classes++;
  if (classes < 3) return { ok: false, error: 'Use at least 3 of: uppercase, lowercase, numbers, symbols' };
  if (BLOCKLIST.has(pw.toLowerCase())) return { ok: false, error: 'This password is too common' };
  return { ok: true };
}

export function passwordStrength(password) {
  const pw = String(password || '');
  let score = 0;
  if (pw.length >= MIN_LENGTH) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (BLOCKLIST.has(pw.toLowerCase())) score = Math.min(score, 1);
  if (pw.length === 0) return { score: 0, label: 'Empty' };
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
  return { score, label: labels[Math.min(score, 5)] };
}
