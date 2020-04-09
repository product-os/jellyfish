/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	'new-nominal-submission': {
		expected: require('./new-nominal-submission/expected.json'),
		steps: [
			require('./new-nominal-submission/01.json')
		]
	},
	'empty-submission': {
		expected: require('./empty-submission/expected.json'),
		steps: [
			require('./empty-submission/01.json')
		]
	},
	'empty-with-grade-10-and-invite': {
		expected: require('./empty-with-grade-10-and-invite/expected.json'),
		steps: [
			require('./empty-with-grade-10-and-invite/01.json')
		]
	},
	'empty-with-grade-9-and-invalid-email': {
		expected: require('./empty-with-grade-9-and-invalid-email/expected.json'),
		steps: [
			require('./empty-with-grade-9-and-invalid-email/01.json')
		]
	},
	'empty-with-grade-9-and-invite': {
		expected: require('./empty-with-grade-9-and-invite/expected.json'),
		steps: [
			require('./empty-with-grade-9-and-invite/01.json')
		]
	},
	'semi-answered-with-grade-8-no-invite': {
		expected: require('./semi-answered-with-grade-8-no-invite/expected.json'),
		steps: [
			require('./semi-answered-with-grade-8-no-invite/01.json')
		]
	}
}
