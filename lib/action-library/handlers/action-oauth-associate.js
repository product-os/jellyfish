/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const sync = require('../../sync')
const syncContext = require('./sync-context')

const handler = async (session, context, card, request) => {
	return sync.associate(
		request.arguments.provider,
		card,
		request.arguments.credentials,

		// We need privileged access in order to add the access
		// token data to the user, as the request that will
		// initiate this action is the external service when
		// posting us back the temporart access code.
		syncContext.fromWorkerContext(request.arguments.provider,
			context, request.context, context.privilegedSession)
	)
}

module.exports = {
	handler
}
