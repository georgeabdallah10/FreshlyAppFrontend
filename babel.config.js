module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@': '.',
          },
          extensions: [
            '.web.ts',
            '.web.tsx',
            '.web.js',
            '.web.jsx',
            '.ts',
            '.tsx',
            '.js',
            '.jsx',
            '.json',
          ],
        },
      ],
    ],
  };
};
