const {
	getSdk
} = require('@balena/jellyfish-client-sdk')
const environment = require('@balena/jellyfish-environment').defaultEnvironment

exports.login = async () => {
	const sdk = await getSdk({
		apiPrefix: 'api/v2',
		apiUrl: `${environment.http.host}:${environment.http.port}`
	})

	const session = await sdk.auth.login({
		username: environment.test.user.username,
		password: environment.test.user.password
	})
	sdk.setAuthToken(session.id)

	return sdk
}

exports.waitForMatch = async (sdk, query, times = 40) => {
	if (times === 0) {
		throw new Error('The wait query did not resolve')
	}

	const results = await sdk.query(query)

	if (results.length > 0) {
		return results[0]
	}
	await new Promise((resolve) => {
		setTimeout(resolve, 1000)
	})
	return exports.waitForMatch(sdk, query, times - 1)
}

exports.executeThenWait = async (sdk, asyncFn, waitQuery) => {
	if (asyncFn) {
		await asyncFn()
	}

	return exports.waitForMatch(sdk, waitQuery)
}

exports.afterEach = (sdk) => {
	sdk.cancelAllStreams()
	sdk.cancelAllRequests()
}
