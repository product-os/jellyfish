/* eslint-env node */
/* eslint-disable no-process-env */

const {
	defaultEnvironment: environment
} = require('@balena/jellyfish-environment')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')
const DefinePlugin = require('webpack/lib/DefinePlugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin')

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

const config = {
	entry: path.join(uiRoot, 'index.tsx'),
	target: 'web',
	devtool: process.env.NODE_ENV === 'production' ? 'eval' : 'eval-cheap-module-source-map',
	mode: process.env.NODE_ENV || 'production',

	output: {
		filename: '[name].[contenthash].js',
		path: outDir,
		publicPath: '/'
	},
	resolve: {
		extensions: [ '.js', '.jsx', '.ts', '.tsx', '.json' ]
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
				test: /\.(js|jsx)$/,
				exclude: /node_modules\/(?!(@balena\/jellyfish-(ui-components|chat-widget))\/).*/,
				use: [
					{
						loader: 'esbuild-loader',
						options: {
							loader: 'jsx',
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

		new NodePolyfillPlugin()
	],
	devServer: {
		static: {
			directory: outDir
		},
		host: '0.0.0.0',
		port: environment.ui.port,
		compress: true,
		allowedHosts: 'all',
		historyApiFallback: {
			disableDotRule: true
		},
		hot: false,
		liveReload: true,
		watchFiles: [
			'ui-components',
			'chat-widget',
			'client-sdk',
			'environment'
		].map((name) => {
			return `@balena/jellyfish-${name}`
		}).concat('rendition').map((name) => {
			return `/node_modules/${name}/**/*`
		}).concat('lib/**/*')
	}
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

module.exports = config
