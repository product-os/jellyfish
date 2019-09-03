/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')
const DefinePlugin = require('webpack/lib/DefinePlugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const mergeConfig = require('webpack-merge')
const baseConfig = require('../../webpack.config.base.js')

const root = path.resolve(__dirname, '..', '..')
const resourcesRoot = __dirname

// eslint-disable-next-line no-process-env
const UI_DIRECTORY = process.env.UI_DIRECTORY || __dirname

const uiRoot = path.resolve(root, UI_DIRECTORY)
const indexFilePath = path.join(resourcesRoot, 'index.html')
const outDir = path.join(root, 'dist/chat-widget')
const packageJSON = require('../../package.json')

console.log(`Generating bundle from ${uiRoot}`)

const config = mergeConfig(baseConfig, {
	entry: path.join(uiRoot, 'index.jsx'),

	output: {
		filename: 'bundle.[hash].js',
		path: outDir,
		publicPath: '/'
	},

	devServer: {
		contentBase: outDir,
		port: 9100
	},

	plugins: [
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
				CHAT_WIDGET_JELLYFISH_TOKEN: JSON.stringify(process.env.CHAT_WIDGET_JELLYFISH_TOKEN),

				// So that it matches git tags
				VERSION: JSON.stringify(`v${packageJSON.version}`)
			}
			/* eslint-enable no-process-env */
		})
	]
})

// eslint-disable-next-line no-process-env
if (process.env.NODE_ENV !== 'production') {
	config.plugins.push(
		new BundleAnalyzerPlugin({
			analyzerMode: 'static',
			reportFilename: path.resolve(outDir, 'webpack-bundle-report.chat-widget.html'),
			openAnalyzer: false
		})
	)
}

module.exports = config
