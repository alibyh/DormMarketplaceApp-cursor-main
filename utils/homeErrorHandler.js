import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { BaseError } from './errors/BaseError';

export const HOME_ERROR_CODES = {
  FETCH_PRODUCTS: 'fetch_products_failed',
  FETCH_BANNERS: 'fetch_banners_failed',
  FETCH_PROFILES: 'fetch_profiles_failed',
  SORT_ERROR: 'sort_error',
  FILTER_ERROR: 'filter_error',
  NETWORK: 'network_error',
  PAGINATION: 'pagination_error'
};

export const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  FETCH_PRODUCTS: 'FETCH_PRODUCTS',
  FETCH_BANNERS: 'FETCH_BANNERS',
  FETCH_DATA: 'FETCH_DATA',
  UNKNOWN: 'UNKNOWN'
};

export class HomeError extends BaseError {
  constructor(message, code = HOME_ERROR_CODES.FETCH_PRODUCTS, details = {}) {
    super('HOME', message, code, details);
  }
}

export const handleHomeError = async (error, t, type = ERROR_TYPES.UNKNOWN) => {
  console.error(`HomeScreen Error (${type}):`, error);

  // First check network connectivity
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) {
    Alert.alert(
      t('connectionError'),
      t('checkInternetConnection'),
      [{ text: t('ok') }]
    );
    return;
  }

  switch (type) {
    case ERROR_TYPES.FETCH_PRODUCTS:
      Alert.alert(
        t('errorLoadingProducts'),
        t('unableToLoadProducts'),
        [{ text: t('ok') }]
      );
      break;

    case ERROR_TYPES.FETCH_BANNERS:
      Alert.alert(
        t('errorLoadingBanners'),
        t('unableToLoadBanners'),
        [{ text: t('ok') }]
      );
      break;

    case ERROR_TYPES.FETCH_DATA:
      Alert.alert(
        t('errorLoadingData'),
        t('unableToLoadData'),
        [{ text: t('ok') }]
      );
      break;

    default:
      Alert.alert(
        t('error'),
        t('unexpectedError'),
        [{ text: t('ok') }]
      );
  }
};