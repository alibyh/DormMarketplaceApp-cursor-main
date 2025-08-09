import { Alert } from 'react-native';
import { ErrorTypes } from './errorHandler';

export const handleSubmissionError = (error, t, errorType = 'UNKNOWN') => {
  console.error('Submission Error:', error);
  let errorMessage;

  switch (errorType) {
    case 'IMAGE_UPLOAD':
      errorMessage = t('imageUploadError');
      break;
    case 'NETWORK':
      errorMessage = t('networkError');
      break;
    case 'STORAGE':
      errorMessage = t('storageError');
      break;
    default:
      errorMessage = t('submissionError');
  }

  Alert.alert(
    t('Error'),
    errorMessage,
    [{ text: t('OK') }]
  );
};