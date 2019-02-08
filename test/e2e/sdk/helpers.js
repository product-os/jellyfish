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

exports.sdk = {
	beforeEach: async (test) => {
		await helpers.server.beforeEach(test)

		// Since AVA tests are running concurrently, set up an SDK instance that will
		// communicate with whichever port this server instance bound to
		test.context.sdk = getSdk({
			apiPrefix: 'api/v2',
			apiUrl: `http://localhost:${test.context.server.port}`
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
	},

	afterEach: async (test) => {
		test.context.sdk.cancelAllStreams()
		test.context.sdk.cancelAllRequests()
		await helpers.server.afterEach(test)
	}
}
