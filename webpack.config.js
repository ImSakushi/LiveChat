const path = require('path');
module.exports = {
  mode: 'production',
  entry: {
    design: './renderer/design.js',
    overlay: './renderer/overlay.js',
  },
  output: {
    path: path.resolve(__dirname, 'renderer/dist'),
    filename: '[name].bundle.js'
  },
  module: {
    rules: [{
      test: /\.m?js$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: { presets: ['@babel/preset-env'] }
      }
    }]
  },
  resolve: {
    fallback: { fs: false, path: false, os: false }
  }
};
