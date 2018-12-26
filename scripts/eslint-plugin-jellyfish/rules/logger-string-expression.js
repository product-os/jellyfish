/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
