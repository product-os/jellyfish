/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

// A helper that limits the files that are transpiled
// using babel during Ava's test step.
// See https://github.com/avajs/ava/blob/master/docs/recipes/babel.md#compile-sources

require('@babel/register')({
	only: [
		/lib\/ui/
	]
})
