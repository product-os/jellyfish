/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	meta: {
		type: 'problem',
		schema: [],
		docs: {
			description: 'Logger log name',
			category: 'Logger',
			recommended: true
		}
	},

	create: (context) => {
		return {
			CallExpression: (node) => {
				if (node.callee.type === 'MemberExpression' &&
						node.callee.object.type === 'Identifier' &&
						node.callee.object.name === 'logger') {
					const title = node.arguments[1] || []
					if (title.type !== 'Literal') {
						context.report({
							node,
							message: 'Logger title should be an static expression'
						})

						return
					}

					// eslint-disable-next-line lodash/prefer-lodash-typecheck
					if (typeof title.value !== 'string') {
						context.report({
							node,
							message: 'Logger title should be a string'
						})
					}
				}
			}
		}
	}
}
