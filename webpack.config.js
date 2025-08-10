const path = require('path');

module.exports = {
  target: 'node',
  mode: 'production',
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  externals: {
    // AWS SDK is available in Lambda runtime
    'aws-sdk': 'aws-sdk',
    '@aws-sdk/client-dynamodb': '@aws-sdk/client-dynamodb',
    '@aws-sdk/lib-dynamodb': '@aws-sdk/lib-dynamodb',
    '@aws-sdk/client-s3': '@aws-sdk/client-s3',
    '@aws-sdk/s3-request-presigner': '@aws-sdk/s3-request-presigner',
    '@aws-sdk/client-cognito-identity-provider': '@aws-sdk/client-cognito-identity-provider',
  },
  optimization: {
    minimize: true,
    usedExports: true,
    sideEffects: false,
  },
};