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
const computedProperties = require('../../lib/actions/computed-properties')
const credentials = require('../../lib/actions/credentials')

ava.test('should compile a card without templates', (test) => {
	test.deepEqual(computedProperties.compile({
		interpolateValues: true,
		type: 'distro',
		name: 'Debian',
		slug: 'debian'
	}), {
		interpolateValues: true,
		type: 'distro',
		name: 'Debian',
		slug: 'debian'
	})
})

ava.test('should compile a single top level template', (test) => {
	test.deepEqual(computedProperties.compile({
		interpolateValues: true,
		type: 'distro',
		name: 'Debian {{version}}',
		version: 'wheezy',
		slug: 'debian'
	}), {
		interpolateValues: true,
		type: 'distro',
		name: 'Debian wheezy',
		version: 'wheezy',
		slug: 'debian'
	})
})

ava.test('should compile templates inside arrays', (test) => {
	test.deepEqual(computedProperties.compile({
		interpolateValues: true,
		type: 'distro',
		name: 'Debian',
		slug: 'debian',
		random: [
			'{{name}}',
			'{{name}}',
			'{{name}}'
		],
		requires: [
			{
				name: '{{name}} ({{type}})'
			}
		]
	}), {
		interpolateValues: true,
		type: 'distro',
		name: 'Debian',
		slug: 'debian',
		random: [
			'Debian',
			'Debian',
			'Debian'
		],
		requires: [
			{
				name: 'Debian (distro)'
			}
		]
	})
})

ava.test('should compile multiple top level templates', (test) => {
	test.deepEqual(computedProperties.compile({
		interpolateValues: true,
		type: 'distro',
		name: 'Debian {{version}}',
		version: 'wheezy',
		slug: 'debian-{{version}}'
	}), {
		interpolateValues: true,
		type: 'distro',
		name: 'Debian wheezy',
		version: 'wheezy',
		slug: 'debian-wheezy'
	})
})

ava.test('should compile a single nested template', (test) => {
	test.deepEqual(computedProperties.compile({
		interpolateValues: true,
		type: 'distro',
		name: 'Debian',
		version: 'wheezy',
		slug: 'debian',
		data: {
			foo: {
				bar: {
					baz: '{{type}}'
				}
			}
		}
	}), {
		interpolateValues: true,
		type: 'distro',
		name: 'Debian',
		version: 'wheezy',
		slug: 'debian',
		data: {
			foo: {
				bar: {
					baz: 'distro'
				}
			}
		}
	})
})

ava.test('should leave missing values as interpolations', (test) => {
	test.throws(() => {
		computedProperties.compile({
			interpolateValues: true,
			type: 'distro',
			name: 'Debian',
			version: '{{data.distroName}}',
			slug: 'debian'
		})
	}, 'Could not compile card')
})

ava.test('should resolve interpolations that depend on other interpolations', (test) => {
	test.deepEqual(computedProperties.compile({
		interpolateValues: true,
		type: 'distro',
		name: '{{slug}}',
		version: '{{name}} v1.0.0',
		summary: 'Distro: {{version}}',
		slug: 'debian'
	}), {
		interpolateValues: true,
		type: 'distro',
		name: 'debian',
		version: 'debian v1.0.0',
		summary: 'Distro: debian v1.0.0',
		slug: 'debian'
	})
})

ava.test('should note interpolate values when the `interpolateValues` key is not present', (test) => {
	test.deepEqual(computedProperties.compile({
		type: 'distro',
		name: '{{slug}}',
		version: '{{name}} v1.0.0',
		summary: 'Distro: {{version}}',
		slug: 'debian'
	}), {
		type: 'distro',
		name: '{{slug}}',
		version: '{{name}} v1.0.0',
		summary: 'Distro: {{version}}',
		slug: 'debian'
	})
})

ava.test('should note interpolate values when the `interpolateValues` key is false', (test) => {
	test.deepEqual(computedProperties.compile({
		interpolateValues: false,
		type: 'distro',
		name: '{{slug}}',
		version: '{{name}} v1.0.0',
		summary: 'Distro: {{version}}',
		slug: 'debian'
	}), {
		interpolateValues: false,
		type: 'distro',
		name: '{{slug}}',
		version: '{{name}} v1.0.0',
		summary: 'Distro: {{version}}',
		slug: 'debian'
	})
})

ava.test('should execute Excel functions', (test) => {
	test.deepEqual(computedProperties.compile({
		interpolateValues: true,
		test: '{{ MAX(5, 3) }}'
	}), {
		interpolateValues: true,
		test: '5'
	})
})

ava.test('should evaluate function expressions that depend on other expressions', (test) => {
	const result = computedProperties.compile({
		interpolateValues: true,
		foo: '{{ POW(2, 2) }}',
		test: '{{ POW(foo, 2) }}'
	})

	test.deepEqual(computedProperties.compile(result), {
		interpolateValues: true,
		foo: '4',
		test: '16'
	})
})

ava.test('should have a GENERATESALT function', (test) => {
	const salt = computedProperties.compile({
		interpolateValues: true,
		result: '{{ GENERATESALT() }}'
	}).result

	test.regex(salt, /^[A-Za-z0-9/+]+==?/)
})

ava.test('GENERATESALT: should generate random values', (test) => {
	const salt1 = computedProperties.compile({
		interpolateValues: true,
		result: '{{ GENERATESALT() }}'
	}).result

	const salt2 = computedProperties.compile({
		interpolateValues: true,
		result: '{{ GENERATESALT() }}'
	}).result

	const salt3 = computedProperties.compile({
		interpolateValues: true,
		result: '{{ GENERATESALT() }}'
	}).result

	test.not(salt1, salt2)
	test.not(salt2, salt3)
	test.not(salt3, salt1)
})

ava.test('HASH: should hash a string with a salt', (test) => {
	const salt = credentials.generateSalt()
	const hash = computedProperties.compile({
		interpolateValues: true,
		salt,
		hash: '{{ HASH("foobar", salt) }}'
	}).hash

	test.true(credentials.check('foobar', {
		hash,
		salt
	}))
})

ava.test('HASH: should hash a string with a salt that is also generated on the card', (test) => {
	const result = computedProperties.compile({
		interpolateValues: true,
		salt: '{{ GENERATESALT() }}',
		hash: '{{ HASH("foobar", salt) }}'
	})

	test.true(credentials.check('foobar', result))
	test.false(credentials.check('baz', result))
})
