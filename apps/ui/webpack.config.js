/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-env node */
/* eslint-disable no-process-env */

const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin')
const WorkboxPlugin = require('workbox-webpack-plugin')
const path = require('path')
const webpack = require('webpack')
const DefinePlugin = require('webpack/lib/DefinePlugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const mergeConfig = require('webpack-merge')
const baseConfig = require('../../webpack.config.base.js')

const root = path.resolve(__dirname, '..', '..')
const resourcesRoot = __dirname

const UI_DIRECTORY = process.env.UI_DIRECTORY || __dirname

const uiRoot = path.resolve(root, UI_DIRECTORY)
const uiComponentsPath = path.join(root, 'lib', 'ui-components')
const indexFilePath = path.join(resourcesRoot, 'index.html')
const iconsFolderPath = path.join(resourcesRoot, 'icons')
const uiComponentsIconsFolderPath = path.join(uiComponentsPath, 'icons')
const audioFolderPath = path.join(resourcesRoot, 'audio')
const faviconPath = path.join(resourcesRoot, 'favicon.ico')
const manifestPath = path.join(resourcesRoot, 'manifest.json')
const outDir = path.join(root, 'dist/ui')
const packageJSON = require('../../package.json')

console.log(`Generating bundle from ${uiRoot}`)

const config = mergeConfig(baseConfig, {
	entry: path.join(uiRoot, 'index.jsx'),

	output: {
		filename: '[name].[contenthash].js',
		path: outDir,
		publicPath: '/'
	},

	devServer: {
		contentBase: outDir,
		port: 9000
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
			},
			{
				from: manifestPath
			},
			{
				from: uiComponentsIconsFolderPath,
				to: 'icons'
			}
		]),

		new HtmlWebpackPlugin({
			template: indexFilePath
		}),

		new DefinePlugin({
			env: {
				API_URL: JSON.stringify(process.env.API_URL),
				API_PREFIX: JSON.stringify(process.env.API_PREFIX || 'api/v2/'),
				NODE_ENV: JSON.stringify(process.env.NODE_ENV),
				SENTRY_DSN_UI: JSON.stringify(process.env.SENTRY_DSN_UI),
				MIXPANEL_TOKEN_UI: JSON.stringify(process.env.MIXPANEL_TOKEN_UI),
				JF_DEBUG_SW: JSON.stringify(process.env.JF_DEBUG_SW),

				// So that it matches git tags
				VERSION: JSON.stringify(`v${packageJSON.version}`)
			}
		}),

		new webpack.ContextReplacementPlugin(
			/monaco-editor(\\|\/)esm(\\|\/)vs(\\|\/)editor(\\|\/)common(\\|\/)services/,
			__dirname
		),

		new MonacoWebpackPlugin()
	]
})

if (process.env.NODE_ENV === 'production' ||
		process.env.JF_DEBUG_SW === '1') {
	config.plugins.push(
		new WorkboxPlugin.InjectManifest({
			mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',

			// The vendors.js file is BIG - set this to a safe value of 40MB
			maximumFileSizeToCacheInBytes: 40000000,
			swSrc: './apps/ui/service-worker.js'
		})
	)
}

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
