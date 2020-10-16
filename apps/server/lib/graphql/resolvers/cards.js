/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const schemaFromFilter = (filter) => {
	if (!filter) {
		return {}
	}
	if (typeof (filter) === 'string') {
		return JSON.parse(filter)
	}
	throw new Error('Invalid filter value')
}

module.exports = async function (_source, args, {
	request, queryFacade, logger
}, _info) {
	const querySchema = schemaFromFilter(args.filter)

	return queryFacade
		.queryAPI(request.context, request.sessionToken, querySchema, {}, request.ip)
		.catch((error) => {
			logger.warn(request.context, 'JSON Schema query error', querySchema)
			throw error
		})
}
