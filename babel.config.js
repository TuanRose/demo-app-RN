module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['module-resolver', {
      root: ['./src/01_architecture'],
      alias: {
        '@features': './src/01_architecture/features',
        '@domain': './src/01_architecture/domain',
        '@shared': './src/01_architecture/shared',
        '@services': './src/01_architecture/services',
        '@assets': './src/assets',
      },
    }],
  ],
};
