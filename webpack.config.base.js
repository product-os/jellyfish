/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const IgnorePlugin = require('webpack/lib/IgnorePlugin')

const config = {
	mode: 'development',
	target: 'web',

	resolve: {
		extensions: [ '.js', '.jsx', '.json' ]
	},

	module: {
		rules: [
			{
				test: /\.(js|jsx)$/,
				exclude: /node_modules\/(?!(@balena\/jellyfish-(ui-components|chat-widget))\/).*/,
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
		compress: true,
		historyApiFallback: {
			disableDotRule: true
		},
		host: '0.0.0.0',
		port: 80,
		watchOptions: {
			ignored: /node_modules/
		},
		disableHostCheck: true,
		headers: {
			'Cache-Control': 'public, no-store, no-cache, must-revalidate'
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
} else {
	config.resolve.alias = {
		react: '/usr/src/jellyfish/packages/rendition/node_modules/react/',
		'styled-components': '/usr/src/jellyfish/packages/rendition/node_modules/styled-components/'
	}
}

module.exports = config
