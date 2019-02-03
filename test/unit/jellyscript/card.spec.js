/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const card = require('../../../lib/jellyscript/card')

ava('.getFormulasPaths() should return an empty array given no formulas', (test) => {
	const paths = card.getFormulasPaths({
		type: 'object',
		properties: {
			foo: {
				type: 'string'
			},
			bar: {
				type: 'string'
			}
		}
	})

	test.deepEqual(paths, [])
})

ava('.getFormulasPaths() should return one property with formulas', (test) => {
	const paths = card.getFormulasPaths({
		type: 'object',
		properties: {
			foo: {
				type: 'string',
				$$formula: 'UPPER(input)'
			},
			bar: {
				type: 'string'
			}
		}
	})

	test.deepEqual(paths, [
		{
			formula: 'UPPER(input)',
			output: [ 'foo' ],
			type: 'string'
		}
	])
})

ava('.getFormulasPaths() should return nested properties with formulas', (test) => {
	const paths = card.getFormulasPaths({
		type: 'object',
		properties: {
			foo: {
				type: 'string',
				$$formula: 'UPPER(input)'
			},
			bar: {
				type: 'object',
				properties: {
					baz: {
						type: 'number',
						$$formula: 'POW(input, 2)'
					}
				}
			}
		}
	})

	test.deepEqual(paths, [
		{
			formula: 'UPPER(input)',
			output: [ 'foo' ],
			type: 'string'
		},
		{
			formula: 'POW(input, 2)',
			output: [ 'bar', 'baz' ],
			type: 'number'
		}
	])
})

ava('.getFormulasPaths() should return properties inside arrays', (test) => {
	const paths = card.getFormulasPaths({
		type: 'object',
		anyOf: [
			{
				properties: {
					foo: {
						type: 'string',
						$$formula: 'UPPER(input)'
					}
				}
			},
			{
				properties: {
					bar: {
						type: 'string',
						$$formula: 'LOWER(input)'
					}
				}
			}
		]
	})

	test.deepEqual(paths, [
		{
			formula: 'UPPER(input)',
			output: [ 'foo' ],
			type: 'string'
		},
		{
			formula: 'LOWER(input)',
			output: [ 'bar' ],
			type: 'string'
		}
	])
})
