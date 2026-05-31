// Force single worker before Metro loads (fixes jest-worker OOM on low-RAM Windows)
process.env.METRO_MAX_WORKERS = '1';

const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Low-RAM PCs: 1 worker only (default would use all CPU cores and exhaust memory)
config.maxWorkers = 1;

config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = config;
