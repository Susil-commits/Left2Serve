const MIN_LENGTH = 8;
const BLOCKLIST = [
  'password', 'passw0rd', 'password1', '12345678', '123456789', 'qwerty123',
  'left2serve', 'left2serve123', 'welcome123', 'letmein', 'iloveyou', 'admin123',
];

export function passwordStrength(password) {
  const pw = String(password || '');
  let score = 0;
  if (pw.length >= MIN_LENGTH) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length === 0) return { score: 0, label: 'Empty' };
  if (BLOCKLIST.includes(pw.toLowerCase())) score = Math.min(score, 1);
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
  return { score, label: labels[Math.min(score, 5)] };
}
