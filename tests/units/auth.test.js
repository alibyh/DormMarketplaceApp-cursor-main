import { validateEmail, validatePassword } from '../../utils/validation';

describe('Auth Validation', () => {
  test('validates email correctly', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('invalid-email')).toBe(false);
  });

  test('validates password requirements', () => {
    expect(validatePassword('short')).toBe(false);
    expect(validatePassword('goodPassword123')).toBe(true);
  });
});