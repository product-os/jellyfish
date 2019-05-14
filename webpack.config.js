/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')
const DefinePlugin = require('webpack/lib/DefinePlugin')
const IgnorePlugin = require('webpack/lib/IgnorePlugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

const root = path.resolve(__dirname, '.')
const uiRoot = path.join(root, 'lib', 'ui')
const indexFilePath = path.join(uiRoot, 'index.html')
const iconsFolderPath = path.join(uiRoot, 'icons')
const audioFolderPath = path.join(uiRoot, 'audio')
const faviconPath = path.join(uiRoot, 'favicon.ico')
const outDir = path.join(root, 'dist')
const packageJSON = require('./package.json')

const config = {
	mode: 'development',
	target: 'web',
	entry: path.join(root, 'lib', 'ui', 'index.jsx'),
	output: {
		filename: 'bundle.[hash].js',
		path: outDir
	},

	resolve: {
		extensions: [ '.js', '.jsx', '.json' ],
		alias: {
			'@jellyfish-ui-components': path.resolve(__dirname, 'lib/ui/components'),
			'@jellyfish-ui-shame': path.resolve(__dirname, 'lib/ui/shame')
		}
	},

	module: {
		rules: [
			{
				test: /\.(js|jsx)$/,
				exclude: /node_modules/,
				use: [
					'babel-loader'
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
							name: '[name].[ext]'
						}
					}
				]
			}
		]
	},

	devtool: 'source-map',

	devServer: {
		contentBase: outDir,
		compress: true,
		port: 9000
	},

	node: {
		fs: 'empty'
	},

	plugins: [
		new CopyWebpackPlugin([
			{
				from: iconsFolderPath,
				to: 'icons'
			},
			{
				from: audioFolderPath,
				to: 'audio'
			},
			{
				from: faviconPath
			}
		]),

		new HtmlWebpackPlugin({
			template: indexFilePath
		}),

		new DefinePlugin({
			/* eslint-disable no-process-env */
			'process.env': {
				API_URL: JSON.stringify(process.env.API_URL),
				API_PREFIX: JSON.stringify(process.env.API_PREFIX || 'api/v2/'),
				NODE_ENV: JSON.stringify(process.env.NODE_ENV),
				SENTRY_DSN_UI: JSON.stringify(process.env.SENTRY_DSN_UI),
				MIXPANEL_TOKEN_UI: JSON.stringify(process.env.MIXPANEL_TOKEN_UI),

				// So that it matches git tags
				VERSION: JSON.stringify(`v${packageJSON.version}`)
			}
			/* eslint-enable no-process-env */
		}),

		// The moment.js package includes its locales by default, they are huge and
		// we don't use them, we're going to ignore them
		new IgnorePlugin(/^\.\/locale$/, /moment$/)
	]
}

// eslint-disable-next-line no-process-env
if (process.env.NODE_ENV === 'production') {
	config.mode = 'production'
	config.optimization = {
		minimize: true
	}
} else {
	config.plugins.push(
		new BundleAnalyzerPlugin({
			analyzerMode: 'static',
			reportFilename: '../webpack-bundle-report.html',
			openAnalyzer: false
		})
	)
}

module.exports = config
