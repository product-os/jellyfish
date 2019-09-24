/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const helpers = require('../server/helpers')
const {
	getSdk
} = require('../../../lib/sdk')
const environment = require('../../../lib/environment')

exports.before = async (test) => {
	await helpers.server.beforeEach(test)

	test.context.sdk = getSdk({
		apiPrefix: 'api/v2',
		apiUrl: `${environment.http.host}:${environment.http.port}`
	})

	test.context.executeThenWait = async (asyncFn, waitQuery, times = 20) => {
		if (times === 0) {
			throw new Error('The wait query did not resolve')
		}

		if (asyncFn) {
			await asyncFn()
		}

		const results = await test.context.sdk.query(waitQuery)
		if (results.length > 0) {
			return results[0]
		}

		await Bluebird.delay(1000)
		return test.context.executeThenWait(null, waitQuery, times - 1)
	}
}

exports.after = async (test) => {
	await helpers.server.afterEach(test)
}

exports.beforeEach = (test, token) => {
	test.context.sdk.setAuthToken(token)
}

exports.afterEach = (test) => {
	test.context.sdk.cancelAllStreams()
	test.context.sdk.cancelAllRequests()
}

exports.sdk = {
	before: async (test) => {
		await helpers.server.beforeEach(test)
		await exports.before(test)
	},

	after: async (test) => {
		await exports.after(test)
		await helpers.server.afterEach(test)
	},

	beforeEach: (test) => {
		exports.beforeEach(test, test.context.token)
	},

	afterEach: exports.afterEach
}
