/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const typedErrors = require('typed-errors')

_.each([
	'SyncNoElement',
	'SyncNoActor',
	'SyncNoExternalResource',
	'SyncExternalRequestError',
	'SyncInvalidTemplate'
], (error) => {
	exports[error] = typedErrors.makeTypedError(error)
})
