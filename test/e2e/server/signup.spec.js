/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const helpers = require('../client-sdk/helpers')

ava.before(helpers.before)
ava.after(helpers.after)

ava.beforeEach(helpers.beforeEach)
ava.afterEach(helpers.afterEach)

ava.serial('/signup should not allow requests without username parameter', async (test) => {
	const result = await test.context.http(
		'POST', '/api/v2/signup', {
			email: 'user@balena.io',
			password: '1234'
		})

	test.is(result.code, 400)
	test.deepEqual(result.response, {
		error: true,
		data: 'Invalid username'
	})
})

ava.serial('/signup should not allow requests without email parameter', async (test) => {
	const result = await test.context.http(
		'POST', '/api/v2/signup', {
			username: 'user',
			password: '1234'
		})

	test.is(result.code, 400)
	test.deepEqual(result.response, {
		error: true,
		data: 'Invalid email'
	})
})

ava.serial('/signup should not allow requests without password parameter', async (test) => {
	const result = await test.context.http(
		'POST', '/api/v2/signup', {
			username: 'user',
			email: 'user@balena.io'
		})

	test.is(result.code, 400)
	test.deepEqual(result.response, {
		error: true,
		data: 'Invalid password'
	})
})

ava.serial('/signup should not allow non-string username parameter', async (test) => {
	const result = await test.context.http(
		'POST', '/api/v2/signup', {
			username: 1,
			email: 'user@balena.io',
			password: '1234'
		})

	test.is(result.code, 400)
	test.deepEqual(result.response, {
		error: true,
		data: 'Invalid username'
	})
})

ava.serial('/signup should not allow non-string email parameter', async (test) => {
	const result = await test.context.http(
		'POST', '/api/v2/signup', {
			username: 'user',
			email: 1,
			password: '1234'
		})

	test.is(result.code, 400)
	test.deepEqual(result.response, {
		error: true,
		data: 'Invalid email'
	})
})

ava.serial('/signup should not allow non-string password parameter', async (test) => {
	const result = await test.context.http(
		'POST', '/api/v2/signup', {
			username: 'user',
			email: 'user@balena.io',
			password: 1
		})

	test.is(result.code, 400)
	test.deepEqual(result.response, {
		error: true,
		data: 'Invalid password'
	})
})
