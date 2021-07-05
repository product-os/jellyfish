/* eslint-env node */
/* eslint-disable no-process-env */

const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')
const DefinePlugin = require('webpack/lib/DefinePlugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const WatchIgnorePlugin = require('webpack/lib/WatchIgnorePlugin')

const root = __dirname
const resourcesRoot = path.resolve(__dirname, './lib')

const UI_DIRECTORY = process.env.LIVECHAT_DIR || __dirname

const uiRoot = path.resolve(root, UI_DIRECTORY)
const indexFilePath = path.join(resourcesRoot, 'index.html')
const outDir = path.join(root, 'dist/livechat')

console.log(`Generating bundle from ${uiRoot}`)

const config = {
	mode: process.env.NODE_ENV || 'production',
	target: 'web',

	resolve: {
		extensions: [ '.ts', '.tsx', '.js', '.json' ]
	},

	module: {
		rules: [
			{
				test: /\.(ts|tsx)?$/,
				exclude: /node_modules/,
				use: [
					{
						loader: 'esbuild-loader',
						options: {
							loader: 'tsx',
							target: 'es2015'
						}
					}
				]
			},
			{
				test: /\.css$/,
				use: [ 'style-loader', 'css-loader' ]
			},
			{
				test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
				use: [
					{
						loader: 'file-loader',
						options: {
							name: '[name].[ext]',
							esModule: false
						}
					}
				]
			}
		]
	},

	devtool: 'source-map',

	devServer: {
		/* https://stackoverflow.com/a/69247166/1559300 */
		/* https://github.com/webpack/webpack-dev-server/blob/master/CHANGELOG.md#-breaking-changes-4 */
		sockPort: 'location',
		host: '0.0.0.0',
		port: process.env.LIVECHAT_PORT,
		compress: true,
		historyApiFallback: {
			disableDotRule: true
		},
		disableHostCheck: true,
		publicPath: '/'
	},

	node: {
		fs: 'empty'
	},

	entry: path.join(resourcesRoot, 'index.tsx'),

	output: {
		filename: '[name].[contenthash].js',
		path: outDir,
		publicPath: '/'
	},

	optimization: {
		moduleIds: 'hashed',
		runtimeChunk: 'single',
		splitChunks: {
			cacheGroups: {
				vendor: {
					test: /[\\/]node_modules[\\/]/,
					name: 'vendors',
					chunks: 'all'
				}
			}
		}
	},

	plugins: [
		new HtmlWebpackPlugin({
			template: indexFilePath
		}),

		new DefinePlugin({
			env: {
				NODE_ENV: JSON.stringify(process.env.NODE_ENV),
				SENTRY_DSN_UI: JSON.stringify(process.env.SENTRY_DSN_UI)
			}
		})
	]
}

if (process.env.ANALYZE) {
	config.plugins.push(
		new BundleAnalyzerPlugin({
			analyzerMode: 'static',
			reportFilename: path.resolve(outDir, 'webpack-bundle-report.html'),
			openAnalyzer: false
		})
	)
}

if (process.env.NODE_ENV === 'production') {
	config.mode = 'production'
	config.optimization = {
		minimize: true
	}
} else {
	config.plugins.push(
		new WatchIgnorePlugin([
			/node_modules\/(?!(@balena\/jellyfish-(ui-components|chat-widget|client-sdk))\/).*/
		])
	)
}

module.exports = config
