import { Platform } from 'react-native';

export function isSupportedPlatform() {
    if (!(Platform.OS === 'android' || Platform.OS === 'ios')) {
        throw new Error('The plugin is supported only for Android and iOS.');
    }
}
