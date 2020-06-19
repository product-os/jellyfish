/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const helpers = require('../worker/helpers')
const actionLibrary = require('../../../lib/action-library')
const syncContext = require('../../../lib/action-library/handlers/sync-context')

module.exports = {
	beforeEach: async (test, options) => {
		await helpers.worker.before(test, actionLibrary, options)
		test.context.syncContext = syncContext.fromWorkerContext(
			'test',
			test.context.worker.getActionContext(test.context.context),
			test.context.context,
			test.context.session)
	},
	afterEach: async (test) => {
		await helpers.worker.after(test)
	},
	save: async (test) => {
		await test.context.jellyfish.backend.connection.any('CREATE TABLE cards_copy AS TABLE cards')
	},
	restore: async (test) => {
		await test.context.jellyfish.backend.connection.any('DELETE FROM links')
		await test.context.jellyfish.backend.connection.any('DELETE FROM cards')
		await test.context.jellyfish.backend.connection.any('INSERT INTO cards SELECT * FROM cards_copy')
	}
}
