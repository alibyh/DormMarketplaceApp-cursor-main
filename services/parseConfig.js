// parseConfig.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import Parse from 'parse/react-native';
import 'react-native-get-random-values'; // Required for UUID support in React Native

// Initialize Parse
Parse.setAsyncStorage(AsyncStorage);
Parse.initialize(
  'SfShHsURknABJMyp8t50pWFYEuOsjrFJsicor0Lt', // Replace with your App ID
  'jzzIQueMpTn46lZPCL6c8VmzBtdrvXA4tNQt2EHE' // Replace with your JavaScript Key
);
Parse.serverURL = 'https://dorms.b4a.io/parse'; // Updated Server URL

// Initialize Live Query client
export const liveQueryClient = new Parse.LiveQueryClient({
  applicationId: 'SfShHsURknABJMyp8t50pWFYEuOsjrFJsicor0Lt', // Replace with your App ID
  serverURL: 'wss://dorms.b4a.io/parse', // Updated Live Query WebSocket URL
  javascriptKey: 'jzzIQueMpTn46lZPCL6c8VmzBtdrvXA4tNQt2EHE', // Replace with your JavaScript Key
});

// Open Live Query client
liveQueryClient.open();
