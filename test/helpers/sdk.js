/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const {
	getSdk
} = require('../lib/sdk')
const environment = require('../lib/environment')

const getTestSdk  = async () => {
	return getSdk({
		apiPrefix: 'api/v2',
		apiUrl: `${environment.http.host}:${environment.http.port}`
	})
}

const executeThenWait = async (asyncFn, waitQuery, times = 20) => {
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
		return executeThenWait(null, waitQuery, times - 1)
}

