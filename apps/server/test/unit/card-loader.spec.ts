/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')

const {
	ensureTypeHasVersion
} = require('../../lib/card-loader')

ava('ensureTypeHasVersion() should throw on invalid version', async (test) => {
	test.throws(() => {
		ensureTypeHasVersion('foo-bar@1.x')
	})
})

ava('ensureTypeHasVersion() should default to 1.0.0', async (test) => {
	test.is(ensureTypeHasVersion('foo-bar'), 'foo-bar@1.0.0')
})

ava('ensureTypeHasVersion() should pass-through existing versions', async (test) => {
	test.is(ensureTypeHasVersion('foo-bar@2.3.4'), 'foo-bar@2.3.4')
})
