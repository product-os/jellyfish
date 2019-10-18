/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const typedErrors = require('typed-errors')

_.each([
	'WorkerNoExecuteEvent',
	'WorkerNoElement',
	'WorkerInvalidVersion',
	'WorkerInvalidAction',
	'WorkerInvalidActionRequest',
	'WorkerInvalidTrigger',
	'WorkerInvalidTemplate',
	'WorkerInvalidDuration',
	'WorkerSchemaMismatch',
	'WorkerAuthenticationError'
], (error) => {
	exports[error] = typedErrors.makeTypedError(error)
})
