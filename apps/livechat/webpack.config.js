/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-env node */

const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')
const DynamicCdnWebpackPlugin = require('dynamic-cdn-webpack-plugin')
const DefinePlugin = require('webpack/lib/DefinePlugin')
const mergeConfig = require('webpack-merge')
const baseConfig = require('../../webpack.config.base.js')
const libConfig = require('./webpack.config.lib')

const root = path.resolve(__dirname, '..', '..')
const resourcesRoot = __dirname

// eslint-disable-next-line no-process-env
const UI_DIRECTORY = process.env.UI_DIRECTORY || __dirname

const uiRoot = path.resolve(root, UI_DIRECTORY)
const indexFilePath = path.join(resourcesRoot, 'index.html')
const outDir = path.join(root, 'dist/livechat')

console.log(`Generating bundle from ${uiRoot}`)

const config = mergeConfig(baseConfig, {
	entry: path.join(uiRoot, 'index.jsx'),

	output: {
		filename: 'bundle.[hash].js',
		path: outDir,
		publicPath: '/'
	},

	plugins: [
		new HtmlWebpackPlugin({
			template: indexFilePath
		}),

		new DynamicCdnWebpackPlugin({
			only: [ '@jellyfish/chat-widget' ],
			resolver (name) {
				return {
					name,
					var: 'ChatWidget',
					url: '/chat-widget.js',
					version: ''
				}
			}
		}),

		new DefinePlugin({
			/* eslint-disable no-process-env */
			'process.env': {
				TEST_USER_USERNAME: JSON.stringify(process.env.TEST_USER_USERNAME),
				TEST_USER_PASSWORD: JSON.stringify(process.env.TEST_USER_PASSWORD)
			}
			/* eslint-enable no-process-env */
		})
	],

	devServer: {
		// eslint-disable-next-line no-process-env
		port: process.env.LIVECHAT_PORT
	}
})

module.exports = [ config, libConfig ]
