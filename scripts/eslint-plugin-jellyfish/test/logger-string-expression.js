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

const eslint = require('eslint')

const rule = require('../rules/logger-string-expression')
const ruleTester = new eslint.RuleTester()

ruleTester.run('logger-string-expression', rule, {
	valid: [
		'logger.foobar',
		'logger.debug(ctx, \'Foo Bar\')'
	],
	invalid: [
		{
			// eslint-disable-next-line no-template-curly-in-string
			code: 'logger.warn(ctx, `Hello ${name}`)',
			parserOptions: {
				ecmaVersion: 6
			},
			errors: [
				{
					message: 'Logger title should be an static expression',
					type: 'CallExpression'
				}
			]
		},
		{
			code: 'logger.warn(ctx, "hello" + "world")',
			errors: [
				{
					message: 'Logger title should be an static expression',
					type: 'CallExpression'
				}
			]
		},
		{
			code: 'logger.info(ctx, "hello" + "world")',
			errors: [
				{
					message: 'Logger title should be an static expression',
					type: 'CallExpression'
				}
			]
		},
		{
			code: 'logger.error(ctx, "hello" + "world")',
			errors: [
				{
					message: 'Logger title should be an static expression',
					type: 'CallExpression'
				}
			]
		},
		{
			code: 'logger.debug(ctx, 145)',
			errors: [
				{
					message: 'Logger title should be a string',
					type: 'CallExpression'
				}
			]
		},
		{
			code: 'logger.debug(ctx, ["foo"])',
			errors: [
				{
					message: 'Logger title should be an static expression',
					type: 'CallExpression'
				}
			]
		}
	]
})
