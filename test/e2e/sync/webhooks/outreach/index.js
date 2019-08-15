/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	'create-sequence': {
		expected: require('./create-sequence/expected.json'),
		steps: [
			require('./create-sequence/01.json')
		]
	},
	'create-delete-sequence': {
		expected: require('./create-delete-sequence/expected.json'),
		steps: [
			require('./create-delete-sequence/01.json'),
			require('./create-delete-sequence/02.json'),
			require('./create-delete-sequence/03.json')
		]
	},
	'create-private-sequence-make-public': {
		expected: require('./create-private-sequence-make-public/expected.json'),
		steps: [
			require('./create-private-sequence-make-public/01.json'),
			require('./create-private-sequence-make-public/02.json')
		]
	},
	'create-private-sequence-make-read-only': {
		expected: require('./create-private-sequence-make-read-only/expected.json'),
		steps: [
			require('./create-private-sequence-make-read-only/01.json'),
			require('./create-private-sequence-make-read-only/02.json')
		]
	},
	'create-private-sequence': {
		expected: require('./create-private-sequence/expected.json'),
		steps: [
			require('./create-private-sequence/01.json')
		]
	},
	'create-public-sequence-make-private': {
		expected: require('./create-public-sequence-make-private/expected.json'),
		steps: [
			require('./create-public-sequence-make-private/01.json'),
			require('./create-public-sequence-make-private/02.json')
		]
	},
	'create-public-sequence-make-read-only': {
		expected: require('./create-public-sequence-make-read-only/expected.json'),
		steps: [
			require('./create-public-sequence-make-read-only/01.json'),
			require('./create-public-sequence-make-read-only/02.json')
		]
	},
	'create-read-only-sequence-make-private': {
		expected: require('./create-read-only-sequence-make-private/expected.json'),
		steps: [
			require('./create-read-only-sequence-make-private/01.json'),
			require('./create-read-only-sequence-make-private/02.json')
		]
	},
	'create-read-only-sequence-make-public': {
		expected: require('./create-read-only-sequence-make-public/expected.json'),
		steps: [
			require('./create-read-only-sequence-make-public/01.json'),
			require('./create-read-only-sequence-make-public/02.json')
		]
	},
	'create-read-only-sequence': {
		expected: require('./create-read-only-sequence/expected.json'),
		steps: [
			require('./create-read-only-sequence/01.json')
		]
	},
	'create-rename-sequence': {
		expected: require('./create-rename-sequence/expected.json'),
		steps: [
			require('./create-rename-sequence/01.json'),
			require('./create-rename-sequence/02.json')
		]
	},
	'create-sequence-private-public': {
		expected: require('./create-sequence-private-public/expected.json'),
		steps: [
			require('./create-sequence-private-public/01.json'),
			require('./create-sequence-private-public/02.json'),
			require('./create-sequence-private-public/03.json')
		]
	},
	'create-sequence-update-owner': {
		expected: require('./create-sequence-update-owner/expected.json'),
		steps: [
			require('./create-sequence-update-owner/01.json'),
			require('./create-sequence-update-owner/02.json')
		]
	}
}
