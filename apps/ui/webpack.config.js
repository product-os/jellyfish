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
const {
	merge
} = require('webpack-merge')
const baseConfig = require('./webpack.config.base.js')

const resourcesRoot = __dirname
const uiRoot = process.env.UI_DIRECTORY || __dirname
const uiComponentsPath = path.join('node_modules', '@balena', 'jellyfish-ui-components', 'lib')
const indexFilePath = path.join(resourcesRoot, 'index.html')
const iconsFolderPath = path.join(resourcesRoot, 'icons')
const uiComponentsIconsFolderPath = path.join(uiComponentsPath, 'icons')
const audioFolderPath = path.join(resourcesRoot, 'audio')
const faviconPath = path.join(resourcesRoot, 'favicon.ico')
const manifestPath = path.join(resourcesRoot, 'manifest.json')
const outDir = path.join(__dirname, 'dist/ui')
const packageJSON = require('../../package.json')

console.log(`Generating bundle from ${uiRoot}`)

const config = merge(baseConfig, {
	entry: path.join(uiRoot, 'index.jsx'),

	output: {
		filename: '[name].[contenthash].js',
		path: outDir,
		publicPath: '/'
	},

	optimization: {
		splitChunks: {
			cacheGroups: {
				monaco: {
					test: /[\\/]monaco-editor[\\/]/,
					name: 'monaco-editor',
					chunks: 'all'
				}
			}
		}
	},

	devServer: {
		contentBase: outDir
	},

	plugins: [
		new CopyWebpackPlugin({
			patterns: [
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
			]
		}),

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
			swSrc: './service-worker.js'
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
