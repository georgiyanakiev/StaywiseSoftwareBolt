const COMMON_BREACH_PASSWORDS = new Set([
  'password', 'password1', 'password123', '12345678', '123456789',
  '1234567890', 'qwerty123', 'abc12345', 'iloveyou1', 'welcome1',
  'letmein1', 'monkey123', 'dragon123', 'master123', 'football1',
  'baseball1', 'sunshine1', 'princess1', 'superman1', 'trustno1',
  'changeme1', 'admin1234', 'welcome123', 'password!', 'passw0rd1',
]);

export type PasswordIssue = {
  code: 'length' | 'complexity' | 'common' | 'breach';
  message: string;
};

export function validatePassword(password: string): PasswordIssue[] {
  const issues: PasswordIssue[] = [];

  if (password.length < 8) {
    issues.push({ code: 'length', message: 'Password must be at least 8 characters.' });
  }

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  const variety = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

  if (variety < 3) {
    issues.push({
      code: 'complexity',
      message: 'Password must include at least 3 of: lowercase, uppercase, digits, and symbols.',
    });
  }

  const lower = password.toLowerCase();
  if (COMMON_BREACH_PASSWORDS.has(lower)) {
    issues.push({
      code: 'breach',
      message: 'This password is commonly used and has appeared in known data breaches. Please choose a different one.',
    });
  }

  return issues;
}

export function passwordStrengthScore(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  return Math.min(score, 5);
}
