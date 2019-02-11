/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const marky = require('marky')
const uuid = require('uuid/v4')
const core = require('../lib/core')
const environment = require('../lib/environment')

const context = {
	id: 'benchmark-test'
}

const QUERIES = [
	{
		name: 'non-executed-requests',
		schema: {
			type: 'object',
			additionalProperties: true,
			required: [ 'type' ],
			$$links: {
				'is executed by': null
			},
			properties: {
				type: {
					type: 'string',
					const: 'action-request'
				}
			}
		},
		options: {
			skip: 0,
			limit: 1
		}
	},
	{
		name: 'active-support-threads',
		schema: {
			$$links: {
				'has attached element': {
					type: 'object',
					properties: {
						type: {
							enum: [
								'message',
								'update',
								'create',
								'whisper'
							]
						}
					},
					additionalProperties: true
				}
			},
			type: 'object',
			properties: {
				active: {
					const: true,
					type: 'boolean'
				},
				type: {
					type: 'string',
					const: 'support-thread'
				}
			},
			required: [
				'active',
				'type'
			],
			additionalProperties: true
		},
		options: {
			limit: 500,
			skip: 0,
			sortBy: 'created_at',
			sortDir: 'desc'
		}
	},
	{
		name: 'all-messages',
		schema: {
			type: 'object',
			properties: {
				active: {
					const: true,
					type: 'boolean'
				},
				type: {
					const: 'message'
				}
			},
			markers: {
				type: 'array',
				contains: {
					const: 'org-balena'
				}
			},
			required: [
				'active',
				'type'
			],
			additionalProperties: true
		},
		options: {
			limit: 50,
			skip: 0,
			sortBy: 'created_at',
			sortDir: 'desc'
		}
	},
	{
		name: 'all-views',
		schema: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: 'view'
				}
			},
			additionalProperties: true,
			required: [
				'type'
			]
		},
		options: {}
	}
]

const run = async (username, password) => {
	console.log('Connecting to the database')
	const cache = new core.MemoryCache(environment.getRedisConfiguration())
	await cache.connect(context)

	const jellyfish = await core.create(context, cache, {
		backend: environment.database.options
	})

	console.log('Getting user')
	const userCard = await jellyfish.getCardBySlug(
		context, jellyfish.sessions.admin, `user-${username}`, {
			type: 'user'
		})
	if (!userCard) {
		throw new Error(`No such user: ${username}`)
	}

	console.log('Creating session')
	const session = await jellyfish.insertCard(
		context, jellyfish.sessions.admin, {
			version: '1.0.0',
			type: 'session',
			slug: `session-${username}-benchmark-${uuid()}`,
			data: {
				actor: userCard.id
			}
		})

	if (!session) {
		throw new Error('Couldn\'t create session')
	}

	console.log('Running queries')
	for (const query of QUERIES) {
		console.log(`  -> ${query.name}`)
		marky.mark(query.name)
		await jellyfish.query(
			context, session.id, query.schema, query.options)
		marky.stop(query.name)
	}

	await jellyfish.disconnect(context)
	await cache.disconnect()

	for (const entry of marky.getEntries()) {
		console.log(`${entry.name.padStart(30)} -> ${entry.duration}ms`)
	}
}

run('jviotti').catch((error) => {
	console.error(error)
	process.exit(1)
})
