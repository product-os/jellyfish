/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const typedErrors = require('typed-errors')

_.each([
	'QueueNoRequest',
	'QueueServiceError',
	'QueueInvalidRequest',
	'QueueInvalidAction',
	'QueueInvalidSession'
], (error) => {
	exports[error] = typedErrors.makeTypedError(error)
})
