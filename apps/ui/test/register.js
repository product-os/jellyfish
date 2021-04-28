/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

// A helper that limits the files that are transpiled
// using babel during Ava's test step.
// See https://github.com/avajs/ava/blob/master/docs/recipes/babel.md#compile-sources

/// // require.extensions['.css'] = () => {}

const hook = require('node-hook')
const _ = require('lodash')

// Some modules (such as rendition) import CSS files, as a result we need to
// stub these imports when testing UI code with ava.
hook.hook('.css', _.constant(''))
hook.hook('.svg', _.constant(''))

require('@babel/register')({
	presets: [
		[
			'@babel/preset-env',
			{
				targets: {
					node: '10'
				}
			}
		],
		'@babel/preset-react'
	],
	only: [
		/node_modules\/@balena\/jellyfish-ui-components/,
		/node_modules\/@balena\/jellyfish-chat-widget/,
		/\.jsx$/,
		/apps\/ui/,
		/apps\/livechat/,
		/node_modules\/dagre-d3-renderer/
	]
})

global.env = {}
