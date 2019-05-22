/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	'new-user-delete': {
		expected: require('./new-user-delete/expected.json'),
		steps: [
			require('./new-user-delete/01.json'),
			require('./new-user-delete/02.json')
		]
	},
	'new-user-no-data-add-company': {
		expected: require('./new-user-no-data-add-company/expected.json'),
		steps: [
			require('./new-user-no-data-add-company/01.json'),
			require('./new-user-no-data-add-company/02.json')
		]
	},
	'new-user-no-name-add-name': {
		expected: require('./new-user-no-name-add-name/expected.json'),
		steps: [
			require('./new-user-no-name-add-name/01.json'),
			require('./new-user-no-name-add-name/02.json')
		]
	},
	'new-user-remove-email': {
		expected: require('./new-user-remove-email/expected.json'),
		steps: [
			require('./new-user-remove-email/01.json'),
			require('./new-user-remove-email/02.json')
		]
	},
	'unknown-resource': {
		expected: require('./unknown-resource/expected.json'),
		steps: [
			require('./unknown-resource/01.json')
		]
	},
	'new-user-no-email': {
		expected: require('./new-user-no-email/expected.json'),
		steps: [
			require('./new-user-no-email/01.json')
		]
	},
	'new-user-update-email': {
		expected: require('./new-user-update-email/expected.json'),
		steps: [
			require('./new-user-update-email/01.json'),
			require('./new-user-update-email/02.json')
		]
	},
	'new-user-remove-company': {
		expected: require('./new-user-remove-company/expected.json'),
		steps: [
			require('./new-user-remove-company/01.json'),
			require('./new-user-remove-company/02.json')
		]
	},
	'new-user': {
		expected: require('./new-user/expected.json'),
		steps: [
			require('./new-user/01.json')
		]
	},
	'new-user-no-info': {
		expected: require('./new-user-no-info/expected.json'),
		steps: [
			require('./new-user-no-info/01.json')
		]
	},
	'new-user-no-last-name': {
		expected: require('./new-user-no-last-name/expected.json'),
		steps: [
			require('./new-user-no-last-name/01.json')
		]
	}
}
