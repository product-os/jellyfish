/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const ava = require('ava')
const ViewFacade = require('../../../../../../apps/server/http/facades/view')

ava('viewFacade should discard view slugs without version', async (test) => {
	const viewFacade = new ViewFacade()

	try {
		await viewFacade.queryByView(null, null, 'slug', null, null, null)
		test.fail('This code should not run')
	} catch (err) {
		test.pass()
	}
})

ava('viewFacade should return null if view is not found', async (test) => {
	const viewFacade = new ViewFacade({
		getCardBySlug: _.constant(Promise.resolve(null))
	})

	const result = await viewFacade.queryByView(null, null, 'slug@1.0.0', null, null, null)

	test.falsy(result)
})

ava('viewFacade should reject params not matching params schema', async (test) => {
	const viewFacade = new ViewFacade({
		getCardBySlug: _.constant(Promise.resolve({
			data: {
				arguments: {
					type: 'object',
					required: [ 'types' ],
					properties: {
						types: {
							type: 'array',
							items: {
								type: 'string'
							}
						}
					}
				}
			}
		}))
	})

	const error = await test.throwsAsync(async () => {
		await viewFacade.queryByView(null, null, 'slug@1.0.0', 'wrong param type', null, null)
	})

	test.truthy(error.message)
})

ava('viewFacade should query using a plain (non template) view', async (test) => {
	const viewFacade = new ViewFacade({
		getCardBySlug: _.constant(Promise.resolve({
			example: 'view'
		}))
	}, {
		async queryAPI (_context, _sessionToken, query, _options, _ipAddress) {
			test.deepEqual(query, {
				example: 'view'
			})
		}
	})

	await viewFacade.queryByView(null, null, 'slug@1.0.0', null, null, null)
})

ava('viewFacade should query using a rendered template view', async (test) => {
	const viewFacade = new ViewFacade({
		getCardBySlug: _.constant(Promise.resolve({
			data: {
				allOf: [ {
					name: 'Card type view',
					schema: {
						type: 'object',
						properties: {
							type: {
								type: 'string',
								enum: {
									$eval: 'types'
								}
							},
							active: {
								type: 'boolean',
								const: true
							}
						},
						additionalProperties: true,
						required: [
							'type'
						]
					}
				} ],
				arguments: {
					type: 'object',
					required: [ 'types' ],
					properties: {
						types: {
							type: 'array',
							items: {
								type: 'string'
							}
						}
					}
				}
			}
		}))
	}, {
		async queryAPI (_context, _sessionToken, query, _options, _ipAddress) {
			test.deepEqual(query, {
				data: {
					allOf: [ {
						name: 'Card type view',
						schema: {
							type: 'object',
							properties: {
								type: {
									type: 'string',
									enum: [ 'view', 'view@1.0.0' ]
								},
								active: {
									type: 'boolean',
									const: true
								}
							},
							additionalProperties: true,
							required: [
								'type'
							]
						}
					} ],
					arguments: {
						type: 'object',
						required: [ 'types' ],
						properties: {
							types: {
								type: 'array',
								items: {
									type: 'string'
								}
							}
						}
					}
				}
			})
		}
	})

	await viewFacade.queryByView(null, null, 'slug@1.0.0', {
		types: [ 'view', 'view@1.0.0' ]
	}, null, null)
})
