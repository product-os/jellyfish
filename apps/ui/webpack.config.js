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

const root = __dirname
const resourcesRoot = path.resolve(__dirname, 'lib')

const UI_DIRECTORY = process.env.UI_DIRECTORY || resourcesRoot

const uiRoot = path.resolve(root, UI_DIRECTORY)
const indexFilePath = path.join(resourcesRoot, 'index.html')
const iconsFolderPath = path.join(resourcesRoot, 'icons')
const audioFolderPath = path.join(resourcesRoot, 'audio')
const faviconPath = path.join(resourcesRoot, 'favicon.ico')
const manifestPath = path.join(resourcesRoot, 'manifest.json')
const outDir = path.join(root, 'dist/ui')
const packageJSON = require('../../package.json')

console.log(`Generating bundle from ${uiRoot}`)

const commonConfig = {
	mode: 'development',

	resolve: {
		extensions: [ '.js', '.jsx', '.ts', '.tsx', '.json' ]
	},

	module: {
		rules: [
			{
				test: /\.(ts|tsx)?$/,
				use: 'ts-loader',
				exclude: /node_modules/
			},
			{
				test: /\.(js|jsx)$/,
				exclude: /node_modules\/(?!(@balena\/jellyfish-(ui-components|chat-widget))\/).*/,
				use: [
					{
						loader: 'babel-loader',
						options: {
							presets: [ '@babel/preset-react' ],
							cacheDirectory: true
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
	plugins: []
}

if (process.env.NODE_ENV === 'production') {
	commonConfig.mode = 'production'
	commonConfig.optimization = {
		minimize: true
	}
}

const appConfig = {
	...commonConfig,
	target: 'web',
	devtool: 'source-map',

	devServer: {
		contentBase: outDir,
		host: '0.0.0.0',
		port: process.env.UI_PORT,
		compress: true,
		historyApiFallback: {
			disableDotRule: true
		},
		disableHostCheck: true,
		publicPath: '/',
		watchOptions: {
			ignored: /node_modules\/(?!(\/@balena\/jellyfish-(ui-components|chat-widget|client-sdk|environment))\/|rendition\/).*/
		}
	},

	node: {
		fs: 'empty'
	},

	entry: path.join(uiRoot, 'index.tsx'),

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
				}
			]
		}),

		new HtmlWebpackPlugin({
			template: indexFilePath
		}),

		new DefinePlugin({
			env: {
				NODE_ENV: JSON.stringify(process.env.NODE_ENV),
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
}

if (process.env.NODE_ENV === 'production' ||
		process.env.JF_DEBUG_SW === '1') {
	appConfig.plugins.push(
		new WorkboxPlugin.InjectManifest({
			mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',

			// The vendors.js file is BIG - set this to a safe value of 40MB
			maximumFileSizeToCacheInBytes: 40000000,
			swSrc: './lib/service-worker.js',
			exclude: [ /build\/.*/, /index\.html/ ]
		})
	)
}

if (process.env.NODE_ENV === 'production') {
	appConfig.plugins.push(
		new BundleAnalyzerPlugin({
			analyzerMode: 'static',
			reportFilename: path.resolve(outDir, 'webpack-bundle-report.html'),
			openAnalyzer: false
		})
	)
}

const librariesConfig = {
	...commonConfig,
	target: 'node',
	entry: path.join(uiRoot, 'core/queries.ts'),
	output: {
		path: outDir,
		filename: 'queries.js',
		library: 'queries',
		libraryTarget: 'commonjs'
	}
}

module.exports = [
	appConfig,
	librariesConfig
]
