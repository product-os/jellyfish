/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { ensureTypeHasVersion } from '../../lib/card-loader';

test('ensureTypeHasVersion() should throw on invalid version', async () => {
	expect(() => ensureTypeHasVersion('foo-bar@1.x')).toThrow();
});

test('ensureTypeHasVersion() should default to 1.0.0', async () => {
	expect(ensureTypeHasVersion('foo-bar')).toBe('foo-bar@1.0.0');
});

test('ensureTypeHasVersion() should pass-through existing versions', async () => {
	expect(ensureTypeHasVersion('foo-bar@2.3.4')).toBe('foo-bar@2.3.4');
});
