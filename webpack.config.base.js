/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const path = require('path')
const IgnorePlugin = require('webpack/lib/IgnorePlugin')

// eslint-disable-next-line no-process-env
const WITH_COVERAGE = process.env.COVERAGE === '1'

const config = {
	mode: 'development',
	target: 'web',

	resolve: {
		extensions: [ '.js', '.jsx', '.json' ],
		alias: {
			// We need to change the resolution location if instrumenting code for
			// coverage (via nyc). Otherwise module requires will load the
			// un-instrumented version.
			'@jellyfish': path.resolve(__dirname, WITH_COVERAGE ? '.nyc-root/lib/' : 'lib/')
		}
	},

	module: {
		rules: [
			{
				test: /\.(js|jsx)$/,
				exclude: /node_modules/,
				use: [
					{
						loader: 'babel-loader',
						options: {
							presets: [ '@babel/preset-react' ]
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
							name: '[name].[ext]'
						}
					}
				]
			}
		]
	},

	devtool: 'source-map',

	devServer: {
		compress: true,
		historyApiFallback: {
			disableDotRule: true
		}
	},

	node: {
		fs: 'empty'
	},

	plugins: [
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
}

module.exports = config
