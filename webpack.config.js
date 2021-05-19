const path = require('path');
const { CleanWebpackPlugin } = require('./node_modules/clean-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");
var HtmlWebpackPlugin = require('./node_modules/html-webpack-plugin');
const MiniCssExtractPlugin = require('./node_modules/mini-css-extract-plugin')
const HtmlWebpackInjector = require('html-webpack-injector');
module.exports = {
  mode: 'development',
  devtool: false,
  // watch : true,

  entry: {
    main_head:'./src/js/main.js'
  },
  output: {
    filename: '[name].[hash].js',
    path: path.resolve(__dirname, 'dist'),
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/login.html",
      filename: "./login.html",
      scriptLoading: "blocking",
      chunks: "main_head"
    }),
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      filename: "./index.html",
      scriptLoading: "blocking",
      chunks: "main_head"
    }),
    new HtmlWebpackPlugin({
      template: "./src/setting.html",
      filename: "./setting.html",
      scriptLoading: "blocking",
      chunks: "main_head"
    }),
    new HtmlWebpackInjector(),
    new CopyPlugin({
      patterns: [
        { from: "./src/js/config.js", to: "config.js" },
        { from: "./site.webmanifest", to: "site.webmanifest" },
        { from: "./favicon.ico", to: "favicon.ico" }

      ],
    }),
   
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin({
      filename: "main.[hash].css",
    }),
    
  ],
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader']
      },
      {
        test: /\.(woff|woff2|eot|ttf|svg|css)$/,
        use: {
          loader: "file-loader",
          options: {
            name: "[name].[hash].[ext]"
            //  outputPath: "./dist"
          }
        }
      },
    ]
  },
  resolve: {
    fallback: { crypto: false },
  }
};