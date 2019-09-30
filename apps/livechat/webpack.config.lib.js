/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-env node */

const path = require('path')
const DefinePlugin = require('webpack/lib/DefinePlugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const mergeConfig = require('webpack-merge')
const baseConfig = require('../../webpack.config.base.js')

const root = path.resolve(__dirname, '..', '..')

// eslint-disable-next-line no-process-env
const UI_DIRECTORY = process.env.UI_DIRECTORY || path.resolve(root, 'lib/chat-widget')

const uiRoot = path.resolve(root, UI_DIRECTORY)
const outDir = path.join(root, 'dist/livechat')

console.log(`Generating bundle from ${uiRoot}`)

const config = mergeConfig(baseConfig, {
	entry: path.join(uiRoot, 'index.jsx'),

	output: {
		path: outDir,
		filename: 'chat-widget.js',
		library: 'ChatWidget',
		libraryTarget: 'umd'
	},

	plugins: [
		new DefinePlugin({
			/* eslint-disable no-process-env */
			'process.env': {
				API_URL: JSON.stringify(process.env.API_URL),
				NODE_ENV: JSON.stringify(process.env.NODE_ENV)
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
			reportFilename: path.resolve(outDir, 'webpack-bundle-report.html'),
			openAnalyzer: false
		})
	)
}

module.exports = config
