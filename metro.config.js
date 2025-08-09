const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 🔧 Roll back to the classic resolver so Metro ignores package.json "exports"
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
