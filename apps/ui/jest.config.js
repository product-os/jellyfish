const base = require('@balena/jellyfish-config/config/jest.config')

module.exports = {
	preset: base.preset,
	testEnvironment: 'jsdom',
	transformIgnorePatterns: [
	],
	globals: {
		env: {}
	},
	transform: {
		'node_modules/(entity-decode/(.*)|d3|internmap|delaunator|robust-predicates)': 'jest-esm-transformer',
		'\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga|css)$':
			'<rootDir>/file-transformer.js'
	},
	setupFiles: [ '<rootDir>/test/setup.ts' ]
}
