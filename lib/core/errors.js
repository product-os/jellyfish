/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const typedErrors = require('typed-errors')

_.each([
	'JellyfishDatabaseError',
	'JellyfishDatabaseTimeoutError',
	'JellyfishCacheError',
	'JellyfishInvalidSlug',
	'JellyfishInvalidId',
	'JellyfishInvalidVersion',
	'JellyfishInvalidSchema',
	'JellyfishInvalidPatch',
	'JellyfishInvalidLimit',
	'JellyfishInvalidRegularExpression',
	'JellyfishInvalidSession',
	'JellyfishElementAlreadyExists',
	'JellyfishNoIdentifier',
	'JellyfishAuthenticationError',
	'JellyfishInvalidEnvironmentVariable',
	'JellyfishInvalidExpression',
	'JellyfishNoAction',
	'JellyfishNoElement',
	'JellyfishNoView',
	'JellyfishPermissionsError',
	'JellyfishSchemaMismatch',
	'JellyfishSessionExpired',
	'JellyfishUnknownCardType'
], (error) => {
	exports[error] = typedErrors.makeTypedError(error)
})
