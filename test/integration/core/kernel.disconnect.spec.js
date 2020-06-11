/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const helpers = require('./helpers')

/*
 * Tests in this spec file actively disconnect the server. As such they are
 * seperated from other kernel tests, as each test requires a new connection to
 * be established
 */
ava.serial.beforeEach(helpers.before)
ava.serial.afterEach(helpers.after)

ava('should be able to disconnect the kernel multiple times without errors', async (test) => {
	await test.notThrowsAsync(async () => {
		await test.context.kernel.disconnect(test.context.context)
		await test.context.kernel.disconnect(test.context.context)
		await test.context.kernel.disconnect(test.context.context)
	})
})

ava('.disconnect() should gracefully close streams', async (test) => {
	await test.notThrowsAsync(async () => {
		await test.context.kernel.stream(test.context.context, test.context.kernel.sessions.admin, {
			type: 'object'
		})
		await test.context.kernel.disconnect(test.context.context)
	})
})
