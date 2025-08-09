import { handleAuthError } from '../../utils/authErrorHandler';
import { Alert } from 'react-native';

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn()
  }
}));

const mockT = (key) => key;

describe('Auth Error Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('handles invalid credentials error', () => {
    const error = new Error('Invalid credentials');
    handleAuthError(error, mockT, 'INVALID_CREDENTIALS');
    
    expect(Alert.alert).toHaveBeenCalledWith(
      'loginError',
      'invalidCredentials',
      expect.any(Array)
    );
  });
});