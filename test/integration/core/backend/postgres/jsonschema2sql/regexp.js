/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/*
 * This is a test suite for the non-standard key word "regexp" that is used by the
 * client for doing case insensitive pattern matching.
 * see: https://github.com/epoberezkin/ajv-keywords#regexp
 */
module.exports = {
	name: 'regexp',
	schemas: [
		{
			description: 'regexp does basic pattern matching',
			schema: {
				regexp: {
					pattern: 'foo'
				}
			},
			tests: [
				{
					description: 'a matching pattern is valid',
					data: 'foo',
					valid: true
				},
				{
					description: 'a non-matching pattern is invalid',
					data: 'abc',
					valid: false
				},
				{
					description: 'ignores non-strings',
					data: true,
					valid: true
				}
			]
		},
		{
			description: 'regexp can allow a case insensitive flag',
			schema: {
				regexp: {
					pattern: 'foo',
					flags: 'i'
				}
			},
			tests: [
				{
					description: 'is case insensitive',
					data: 'FOO',
					valid: true
				}
			]
		}
	]
}
