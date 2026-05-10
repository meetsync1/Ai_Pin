// Expo Metro config override.
// We disable package "exports" resolution because some Expo SDK packages
// (e.g. expo-sqlite) internally re-export files that aren't listed in `exports`,
// which can break Metro bundling on Android.

const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: false,
};

module.exports = config;

