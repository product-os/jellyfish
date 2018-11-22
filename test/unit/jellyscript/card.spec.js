/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *		http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
