import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import LoginScreen from '../../screens/LoginScreen/LoginScreen';

jest.mock('../../services/supabaseConfig', () => ({
  auth: {
    signIn: jest.fn(() => Promise.resolve({ user: { id: '123' } }))
  }
}));

const renderWithI18n = (component) => {
  return render(
    <I18nextProvider i18n={i18n}>
      {component}
    </I18nextProvider>
  );
};

describe('Login Screen', () => {
  test('handles login attempt', async () => {
    const { getByPlaceholder, getByText } = renderWithI18n(<LoginScreen />);

    fireEvent.changeText(getByPlaceholder('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholder('Password'), 'password123');
    fireEvent.press(getByText('Login'));

    await waitFor(() => {
      expect(getByText('Loading...')).toBeTruthy();
    });
  });
});