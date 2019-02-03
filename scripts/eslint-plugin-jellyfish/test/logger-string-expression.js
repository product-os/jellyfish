/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
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
