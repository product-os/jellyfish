/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const IgnorePlugin = require('webpack/lib/IgnorePlugin')
const path = require('path')

const config = {
	mode: 'development',
	target: 'web',

	resolve: {
		symlinks: false,
		extensions: [ '.js', '.jsx', '.json' ],
		alias: {
			react$: path.resolve(`${__dirname}/node_modules/react`),
			rendition: path.resolve(`${__dirname}/node_modules/rendition`),
			'react-router-dom': path.resolve(`${__dirname}/node_modules/react-router-dom`),
			'react-dom': path.resolve(`${__dirname}/node_modules/react-dom`)
		}
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
