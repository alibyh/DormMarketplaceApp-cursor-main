import { render } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';

export const renderWithProviders = (ui, options = {}) => {
  return render(
    <I18nextProvider i18n={i18n}>
      {ui}
    </I18nextProvider>,
    options
  );
};