/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'jsdom',
	transformIgnorePatterns: [],
	globals: {
		env: {}
	},
	transform: {
		'\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga|css)$':
			'<rootDir>/file-transformer.js'
	}
}
