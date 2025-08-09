import { 
  validateEmail, 
  validatePassword,
  validateUsername,
  validatePhone,
  validateDormNumber 
} from '../../utils/validation';

describe('Authentication Validation', () => {
  describe('validateEmail', () => {
    test('validates correct email formats', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
    });

    test('rejects invalid email formats', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    test('accepts valid passwords', () => {
      expect(validatePassword('password123')).toBe(true);
      expect(validatePassword('123456')).toBe(true);
    });

    test('rejects invalid passwords', () => {
      expect(validatePassword('12345')).toBe(false);
      expect(validatePassword('')).toBe(false);
      expect(validatePassword(null)).toBe(false);
    });
  });

  describe('validateUsername', () => {
    test('accepts valid usernames', () => {
      expect(validateUsername('john_doe')).toBe(true);
      expect(validateUsername('user123')).toBe(true);
    });

    test('rejects invalid usernames', () => {
      expect(validateUsername('jo')).toBe(false);
      expect(validateUsername('')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    test('accepts valid phone numbers', () => {
      expect(validatePhone('1234567890')).toBe(true);
      expect(validatePhone('+79061234567')).toBe(true);
    });

    test('rejects invalid phone numbers', () => {
      expect(validatePhone('123')).toBe(false);
      expect(validatePhone('abc1234567')).toBe(false);
    });
  });

  describe('validateDormNumber', () => {
    test('accepts valid dorm numbers', () => {
      expect(validateDormNumber('1')).toBe(true);
      expect(validateDormNumber(5)).toBe(true);
    });

    test('rejects invalid dorm numbers', () => {
      expect(validateDormNumber('')).toBe(false);
      expect(validateDormNumber(null)).toBe(false);
    });
  });
});