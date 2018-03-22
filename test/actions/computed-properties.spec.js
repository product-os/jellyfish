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

ava.test('should compile a card without templates', (test) => {
	test.deepEqual(computedProperties.compile({
		type: 'distro',
		name: 'Debian',
		slug: 'debian'
	}), {
		type: 'distro',
		name: 'Debian',
		slug: 'debian'
	})
})

ava.test('should compile a single top level template', (test) => {
	test.deepEqual(computedProperties.compile({
		type: 'distro',
		name: 'Debian {{version}}',
		version: 'wheezy',
		slug: 'debian'
	}), {
		type: 'distro',
		name: 'Debian wheezy',
		version: 'wheezy',
		slug: 'debian'
	})
})

ava.test('should compile templates inside arrays', (test) => {
	test.deepEqual(computedProperties.compile({
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
		type: 'distro',
		name: 'Debian {{version}}',
		version: 'wheezy',
		slug: 'debian-{{version}}'
	}), {
		type: 'distro',
		name: 'Debian wheezy',
		version: 'wheezy',
		slug: 'debian-wheezy'
	})
})

ava.test('should compile a single nested template', (test) => {
	test.deepEqual(computedProperties.compile({
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
			type: 'distro',
			name: 'Debian',
			version: '{{data.distroName}}',
			slug: 'debian'
		})
	}, 'Could not compile card')
})

ava.test('should resolve interpolations that depend on other interpolations', (test) => {
	test.deepEqual(computedProperties.compile({
		type: 'distro',
		name: '{{slug}}',
		version: '{{name}} v1.0.0',
		summary: 'Distro: {{version}}',
		slug: 'debian'
	}), {
		type: 'distro',
		name: 'debian',
		version: 'debian v1.0.0',
		summary: 'Distro: debian v1.0.0',
		slug: 'debian'
	})
})
