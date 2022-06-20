module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: [
		'lib',
		'test'
	],
	testTimeout: 30 * 1000
}
