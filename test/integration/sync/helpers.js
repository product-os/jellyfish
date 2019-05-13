/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const helpers = require('../worker/helpers')
const actionLibrary = require('../../../lib/action-library')
const syncContext = require('../../../lib/action-library/sync-context')

module.exports = {
	beforeEach: async (test, options) => {
		await helpers.worker.beforeEach(test, actionLibrary, options)
		test.context.syncContext = syncContext.fromWorkerContext(
			test.context.worker.getActionContext(test.context.context),
			test.context.context,
			test.context.session)
	},
	afterEach: async (test) => {
		await helpers.worker.afterEach(test)
	}
}
