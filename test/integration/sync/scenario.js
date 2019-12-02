/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const combinatorics = require('js-combinatorics')
const nock = require('nock')
const Bluebird = require('bluebird')
const uuid = require('uuid/v4')
const path = require('path')
const _ = require('lodash')
const syncHelpers = require('../../integration/sync/helpers')

const TRANSLATE_PREFIX = uuid()

const tailSort = [
	(card) => {
		return card.data.timestamp
	},
	(card) => {
		return card.type
	}
]

const getVariations = (sequence, options = {}) => {
	const invariant = _.last(sequence)
	return combinatorics
		.permutationCombination(sequence)
		.toArray()
		.filter((combination) => {
			return _.includes(combination, invariant)
		})

		// Only consider the ones that preserve ordering for now
		.filter((combination) => {
			if (options.permutations) {
				return true
			}

			return _.isEqual(combination, _.clone(combination).sort((left, right) => {
				return _.findIndex(sequence, (element) => {
					return _.isEqual(element, left)
				}) - _.findIndex(sequence, (element) => {
					return _.isEqual(element, right)
				})
			}))
		})

		.map((combination) => {
			return {
				name: combination.map((element) => {
					return sequence.indexOf(element) + 1
				}).join('-'),
				combination
			}
		})
}

const requireStub = (basePath, offset, name) => {
	if (offset === 0) {
		console.warn(`Stub not found: ${name}`)
		return null
	}

	const stubPath = path.join(basePath, `${offset}`, `${name}.json`)
	try {
		return require(stubPath)
	} catch (error) {
		if (error.code === 'MODULE_NOT_FOUND') {
			return requireStub(basePath, offset - 1, name)
		}

		throw error
	}
}

const webhookScenario = async (test, testCase, integration, stub) => {
	let webhookOffset = testCase.offset

	await nock(stub.baseUrl)
		.persist()
		.get(stub.uriPath)
		.query(true)
		.reply(function (uri, request, callback) {
			if (!stub.isAuthorized(this.req)) {
				return callback(null, [ 401, this.req.headers ])
			}

			// Omit query parameters that start with "api" as
			// they contain secrets.
			const [ baseUri, queryParams ] = uri.split('?')
			const queryString = (queryParams || '').split('&').reduce((accumulator, part) => {
				const [ key, value ] = part.split('=')
				if (key.startsWith('api')) {
					return accumulator
				}

				return [ accumulator, key, value ].join('-')
			}, '')

			const jsonPath = _.kebabCase(`${baseUri}-${queryString}`)
			const content = requireStub(
				path.join(stub.basePath, testCase.name, 'stubs'),
				webhookOffset, jsonPath)
			const code = content ? 200 : 404
			return callback(null, [
				code,
				content
			])
		})

	const cards = []
	for (const step of testCase.steps) {
		webhookOffset = Math.max(webhookOffset, _.findIndex(testCase.original, step) + 1)

		const data = {
			source: integration.source,
			headers: step.headers,
			payload: step.payload
		}

		const event = await test.context.jellyfish.insertCard(test.context.context,
			test.context.session, {
				type: 'external-event',
				slug: test.context.generateRandomSlug({
					prefix: 'external-event'
				}),
				version: '1.0.0',
				data: await testCase.prepareEvent(data)
			})

		const request = await test.context.queue.enqueue(
			test.context.worker.getId(),
			test.context.session, {
				context: test.context.context,
				action: 'action-integration-import-event',
				card: event.id,
				type: event.type,
				arguments: {}
			})

		await test.context.flush(test.context.session, 1)
		const result = await test.context.queue.waitResults(
			test.context.context, request)
		test.false(result.error)
		cards.push(...result.data)
	}

	if (!testCase.expected.head) {
		test.is(cards.length, 0)
		return
	}

	test.true(cards.length > 0)

	const head = await test.context.jellyfish.getCardById(test.context.context,
		test.context.session, cards[testCase.headIndex].id, {
			type: cards[testCase.headIndex].type
		})

	// TODO: Remove once we fully support versioned
	// slug references in the sync module.
	head.type = `${head.type}@1.0.0`

	deleteExtraLinks(testCase.expected.head, head)
	Reflect.deleteProperty(head, 'markers')
	Reflect.deleteProperty(head.data, 'origin')
	Reflect.deleteProperty(head.data, 'translateDate')

	const timeline = await test.context.jellyfish.query(test.context.context,
		test.context.session, {
			type: 'object',
			additionalProperties: true,
			required: [ 'data' ],
			properties: {
				data: {
					type: 'object',
					required: [ 'target' ],
					additionalProperties: true,
					properties: {
						target: {
							type: 'string',
							const: head.id
						}
					}
				}
			}
		})

	testCase.expected.head.slug =
		testCase.expected.head.slug || head.slug

	test.deepEqual(
		Object.assign(
			testCase.expected.head,
			_.pick(head, [
				'id',
				'created_at',
				'updated_at',
				'linked_at'
			])
		),
		head
	)

	const tailFilter = (card) => {
		const baseType = card.type.split('@')[0]
		if (testCase.ignoreUpdateEvents && baseType === 'update') {
			return false
		}

		if (baseType === 'message' || baseType === 'whisper') {
			if (!card.active && card.data.payload.message.trim().length === 0) {
				return false
			}
		}

		return true
	}

	const actualTail = await Bluebird.map(_.sortBy(_.filter(timeline, tailFilter), tailSort), async (card) => {
		Reflect.deleteProperty(card, 'slug')
		Reflect.deleteProperty(card, 'links')
		Reflect.deleteProperty(card, 'markers')
		Reflect.deleteProperty(card, 'created_at')
		Reflect.deleteProperty(card, 'updated_at')
		Reflect.deleteProperty(card, 'linked_at')
		Reflect.deleteProperty(card.data, 'origin')
		Reflect.deleteProperty(card.data, 'translateDate')

		// TODO: Remove once we fully support versioned
		// slug references in the sync module.
		card.type = `${card.type}@1.0.0`

		const actorCard = await test.context.jellyfish.getCardById(
			test.context.context, test.context.session, card.data.actor)
		card.data.actor = actorCard
			? {
				slug: actorCard.slug,
				active: actorCard.active
			}
			: card.data.actor

		if (card.type.split('@')[0] === 'update') {
			card.data.payload = card.data.payload.filter((operation) => {
				return ![
					'/data/origin',
					'/linked_at/has attached element'
				].includes(operation.path)
			})

			if (card.data.payload.length === 0) {
				return null
			}
		} else if (card.data.payload) {
			Reflect.deleteProperty(card.data.payload, 'slug')
			Reflect.deleteProperty(card.data.payload, 'links')
			Reflect.deleteProperty(card.data.payload, 'markers')
			Reflect.deleteProperty(card.data.payload, 'created_at')
			Reflect.deleteProperty(card.data.payload, 'updated_at')
			Reflect.deleteProperty(card.data.payload, 'linked_at')

			if (card.data.payload.data) {
				Reflect.deleteProperty(card.data.payload.data, 'origin')
				Reflect.deleteProperty(card.data.payload.data, 'translateDate')
			}

			// TODO: Remove once we fully support versioned
			// slug references in the sync module.
			if (card.data.payload.type) {
				card.data.payload.type = `${card.data.payload.type}@1.0.0`
			}
		}

		return card
	})

	const expectedTail = _.map(_.sortBy(_.filter(testCase.expected.tail, tailFilter), tailSort), (card, index) => {
		card.id = _.get(actualTail, [ index, 'id' ])
		card.name = _.get(actualTail, [ index, 'name' ])

		card.data.target = head.id

		// If we have to ignore the update events, then we can't also
		// trust the create event to be what it should have been at
		// the beginning, as services might not preserve that information.
		if (testCase.ignoreUpdateEvents && card.type.split('@')[0] === 'create') {
			card.data.payload = _.get(actualTail, [ index, 'data', 'payload' ])
			card.data.timestamp = _.get(actualTail, [ index, 'data', 'timestamp' ])
		}

		return card
	})

	test.deepEqual(expectedTail, _.compact(actualTail))
}

const deleteExtraLinks = (expected, result) => {
	// If links is not present in expected we just remove the whole thing
	if (!expected.links) {
		Reflect.deleteProperty(result, 'links')
	}

	// Otherwise we recursively remove all relationships and links inside them
	// where the relationship does not match the relationship specified in expected
	const difference = getObjDifference(expected.links, result.links)

	_.each(difference, (rel) => {
		Reflect.deleteProperty(result.links, rel)
	})

	_.each(result.links, (links, relationship) => {
		_.each(links, (link, index) => {
			const linkDiff = getObjDifference(
				expected.links[relationship][index],
				result.links[relationship][index]
			)
			_.each(linkDiff, (rel) => {
				Reflect.deleteProperty(result.links[relationship][index], rel)
			})
		})
	})
}

const getObjDifference = (expected, obtained) => {
	const expectedKeys = _.keys(expected)
	const obtainedKeys = _.keys(obtained)
	return _.difference(obtainedKeys, expectedKeys)
}

module.exports = {
	beforeEach: async (test) => {
		await syncHelpers.beforeEach(test, {
			suffix: TRANSLATE_PREFIX
		})

		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../apps/server/default-cards/contrib/external-event.json'))
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../apps/server/default-cards/contrib/issue.json'))
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../apps/server/default-cards/contrib/pull-request.json'))
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../apps/server/default-cards/contrib/email-sequence.json'))
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../apps/server/default-cards/contrib/repository.json'))
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../apps/server/default-cards/contrib/push.json'))
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../apps/server/default-cards/contrib/support-thread.json'))
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../apps/server/default-cards/contrib/sales-thread.json'))
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../apps/server/default-cards/contrib/whisper.json'))

		nock.cleanAll()
		nock.disableNetConnect()
	},
	afterEach: async (test) => {
		await syncHelpers.afterEach(test)

		nock.cleanAll()
	},

	run: async (ava, suite) => {
		const getTestCaseOptions = (test) => {
			return {
				constructor: suite.integration,
				source: suite.source,
				options: Object.assign({
					context: test.context.context,
					session: test.context.session,
					actor: test.context.actor.id
				}, suite.options)
			}
		}

		const stubOptions = {
			baseUrl: suite.baseUrl,
			uriPath: suite.stubRegex,
			basePath: path.join(__dirname, 'webhooks', suite.source),
			isAuthorized: _.partial(suite.isAuthorized, suite)
		}

		for (const testCaseName of Object.keys(suite.scenarios)) {
			const testCase = suite.scenarios[testCaseName]
			const fn = ava.serial || ava
			const expected = {
				head: testCase.expected.head,
				tail: _.sortBy(testCase.expected.tail, tailSort)
			}

			for (const variation of getVariations(testCase.steps, {
				permutations: suite.source !== 'github'
			})) {
				// TODO: We should remove this check
				if (suite.source === 'github' &&
					variation.combination.length !== testCase.steps.length) {
					continue
				}

				const prepareEventNoop = async (data) => {
					return data
				}

				// eslint-disable-next-line no-loop-func
				fn(`(${variation.name}) ${testCaseName}`, async (test) => {
					if (suite.pre) {
						await suite.pre(test)
					}

					await webhookScenario(test, {
						steps: variation.combination,
						prepareEvent: suite.prepareEvent || prepareEventNoop,
						offset: _.findIndex(testCase.steps, _.first(variation.combination)) + 1,
						headIndex: testCase.headIndex || 0,
						original: testCase.steps,

						// If we miss events such as when a head card was archived,
						// we usually can't know the date this happened, but we can
						// still apply it with a date approximation. In those cases,
						// its helpful to omit the update events from the tail checks.
						ignoreUpdateEvents: !_.isEqual(variation.combination, testCase.steps),

						expected: _.cloneDeep(expected),
						name: testCaseName,
						variant: variation.name
					}, getTestCaseOptions(test), stubOptions)
				})
			}
		}
	}
}
