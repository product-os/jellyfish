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

exports.sdk = {
	before: async (test) => {
		await helpers.server.beforeEach(test)

		// Since AVA tests are running concurrently, set up an SDK instance that will
		// communicate with whichever port this server instance bound to
		test.context.sdk = getSdk({
			apiPrefix: 'api/v2',
			apiUrl: `http://localhost:${environment.http.port}`
		})

		const session = await test.context.sdk.auth.login({
			username: environment.test.user.username,
			password: environment.test.user.password
		})

		test.context.token = session.id

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
	},

	after: async (test) => {
		await helpers.server.afterEach(test)
	},

	beforeEach: (test) => {
		test.context.sdk.setAuthToken(test.context.token)
	},

	afterEach: (test) => {
		test.context.sdk.cancelAllStreams()
		test.context.sdk.cancelAllRequests()
	}
}
