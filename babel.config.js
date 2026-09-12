module.exports = function (api) {
  api.cache(true);
  // babel-preset-expo resolves react-native-worklets/plugin itself when
  // Reanimated is installed — adding it by hand would register it twice.
  return { presets: ['babel-preset-expo'] };
};
