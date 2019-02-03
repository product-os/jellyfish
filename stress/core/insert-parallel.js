/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const marky = require('marky')
const uuid = require('uuid/v4')
const helpers = require('../../test/integration/core/helpers')
const utils = require('../utils')

const test = {
	context: {}
}

const run = async () => {
	await helpers.kernel.beforeEach(test)

	for (let times = 0; times < 100; times++) {
		const name = `Card ${times}`
		marky.mark(name)

		await Promise.all([
			test.context.kernel.insertCard(
				test.context.context, test.context.kernel.sessions.admin, test.context.kernel.defaults({
					type: 'card',
					slug: `card-${uuid()}`,
					version: '1.0.0',
					data: {
						count: times
					}
				})),
			test.context.kernel.insertCard(
				test.context.context, test.context.kernel.sessions.admin, test.context.kernel.defaults({
					type: 'card',
					slug: `card-${uuid()}`,
					version: '1.0.0',
					data: {
						count: times
					}
				})),
			test.context.kernel.insertCard(
				test.context.context, test.context.kernel.sessions.admin, test.context.kernel.defaults({
					type: 'card',
					slug: `card-${uuid()}`,
					version: '1.0.0',
					data: {
						count: times
					}
				})),
			test.context.kernel.insertCard(
				test.context.context, test.context.kernel.sessions.admin, test.context.kernel.defaults({
					type: 'card',
					slug: `card-${uuid()}`,
					version: '1.0.0',
					data: {
						count: times
					}
				})),
			test.context.kernel.insertCard(
				test.context.context, test.context.kernel.sessions.admin, test.context.kernel.defaults({
					type: 'card',
					slug: `card-${uuid()}`,
					version: '1.0.0',
					data: {
						count: times
					}
				})),
			test.context.kernel.insertCard(
				test.context.context, test.context.kernel.sessions.admin, test.context.kernel.defaults({
					type: 'card',
					slug: `card-${uuid()}`,
					version: '1.0.0',
					data: {
						count: times
					}
				})),
			test.context.kernel.insertCard(
				test.context.context, test.context.kernel.sessions.admin, test.context.kernel.defaults({
					type: 'card',
					slug: `card-${uuid()}`,
					version: '1.0.0',
					data: {
						count: times
					}
				})),
			test.context.kernel.insertCard(
				test.context.context, test.context.kernel.sessions.admin, test.context.kernel.defaults({
					type: 'card',
					slug: `card-${uuid()}`,
					version: '1.0.0',
					data: {
						count: times
					}
				})),
			test.context.kernel.insertCard(
				test.context.context, test.context.kernel.sessions.admin, test.context.kernel.defaults({
					type: 'card',
					slug: `card-${uuid()}`,
					version: '1.0.0',
					data: {
						count: times
					}
				})),
			test.context.kernel.insertCard(
				test.context.context, test.context.kernel.sessions.admin, test.context.kernel.defaults({
					type: 'card',
					slug: `card-${uuid()}`,
					version: '1.0.0',
					data: {
						count: times
					}
				})),
			test.context.kernel.insertCard(
				test.context.context, test.context.kernel.sessions.admin, test.context.kernel.defaults({
					type: 'card',
					slug: `card-${uuid()}`,
					version: '1.0.0',
					data: {
						count: times
					}
				})),
			test.context.kernel.insertCard(
				test.context.context, test.context.kernel.sessions.admin, test.context.kernel.defaults({
					type: 'card',
					slug: `card-${uuid()}`,
					version: '1.0.0',
					data: {
						count: times
					}
				})),
			test.context.kernel.insertCard(
				test.context.context, test.context.kernel.sessions.admin, test.context.kernel.defaults({
					type: 'card',
					slug: `card-${uuid()}`,
					version: '1.0.0',
					data: {
						count: times
					}
				})),
			test.context.kernel.insertCard(
				test.context.context, test.context.kernel.sessions.admin, test.context.kernel.defaults({
					type: 'card',
					slug: `card-${uuid()}`,
					version: '1.0.0',
					data: {
						count: times
					}
				})),
			test.context.kernel.insertCard(
				test.context.context, test.context.kernel.sessions.admin, test.context.kernel.defaults({
					type: 'card',
					slug: `card-${uuid()}`,
					version: '1.0.0',
					data: {
						count: times
					}
				})),
			test.context.kernel.insertCard(
				test.context.context, test.context.kernel.sessions.admin, test.context.kernel.defaults({
					type: 'card',
					slug: `card-${uuid()}`,
					version: '1.0.0',
					data: {
						count: times
					}
				})),
			test.context.kernel.insertCard(
				test.context.context, test.context.kernel.sessions.admin, test.context.kernel.defaults({
					type: 'card',
					slug: `card-${uuid()}`,
					version: '1.0.0',
					data: {
						count: times
					}
				}))
		])

		marky.stop(name)
	}

	await helpers.kernel.afterEach(test)
	const entries = marky.getEntries()
	utils.logSummary(entries, 'insert parallel')
}

run()
