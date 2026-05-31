/**
 * Reduces webpack memory use (helps low-RAM PCs complete npm run build).
 */
module.exports = {
  webpack: {
    configure: (config) => {
      config.plugins = config.plugins.filter((plugin) => {
        const name = plugin?.constructor?.name || '';
        return name !== 'ForkTsCheckerWebpackPlugin' && name !== 'ESLintWebpackPlugin';
      });
      if (config.parallelism !== undefined) {
        config.parallelism = 1;
      }
      return config;
    },
  },
};
