/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const sync = require('../../sync')
const environment = require('../../environment')
const syncContext = require('./sync-context')

const handler = async (session, context, card, request) => {
	const syncContextInstance = syncContext.fromWorkerContext(request.arguments.provider,
		context, request.context, session)

	return sync.authorize(
		request.arguments.provider,
		environment.integration[request.arguments.provider],
		syncContextInstance,
		{
			code: request.arguments.code,
			origin: request.arguments.origin
		}
	)
}

module.exports = {
	handler
}
