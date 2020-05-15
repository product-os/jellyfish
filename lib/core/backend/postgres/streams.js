/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const skhema = require('skhema')
const EventEmitter = require('events').EventEmitter
const PGLiveSelect = require('./pg-live-select')
const logger = require('../../../logger').getLogger(__filename)
const uuid = require('../../../uuid')
const utils = require('./utils')
const metrics = require('../../../metrics')

const filter = (schema, element) => {
	if (schema.required && schema.required.length > 0) {
		if (_.isEmpty(element)) {
			return null
		}

		if (_.includes(schema.required, 'slug') &&
			_.has(schema, [ 'properties', 'slug', 'const' ]) &&
			element.slug !== schema.properties.slug.const) {
			return null
		}

		if (_.includes(schema.required, 'type') &&
			_.has(schema, [ 'properties', 'type', 'const' ]) &&
			element.type.split('@')[0] !== schema.properties.type.const.split('@')[0]) {
			return null
		}
	}

	const elementCopy = _.cloneDeep(element)
	const result = skhema.filter(schema, elementCopy)

	// If additionalProperties is false, remove properties that haven't been
	// explicitly selected. This is done because the Skhema module will merge
	// anyOf branches into the top level properties before applying the filter
	// (which is correct) however, due to the Jellyfish permissions system,
	// properties may be added to the result that the initial query did not
	// specify, depending on which permission views are merged in.
	if (schema.additionalProperties === false) {
		for (const item of _.castArray(elementCopy)) {
			for (const key in item) {
				if (!schema.properties[key]) {
					Reflect.deleteProperty(item, key)
				}
			}
		}
	}

	return result
}

exports.setup = async (context, connection, table, columns) => {
	const sco = await connection.connect()
	const lq = new PGLiveSelect(sco.client, `megatream-${table}`, table, columns)
	await lq.start()
	await lq.select()

	lq.close = async () => {
		await lq.stop()
		await sco.done()
	}

	lq.openStreams = {}

	// Otherwise Node.js silently permits only a max of 10
	// listeners per event.
	lq.setMaxListeners(Infinity)

	return lq
}

exports.teardown = async (context, connection, instance) => {
	/*
	 * 1. Loop over the open streams, close them, and remove
	 * any references to them.
	 */
	if (instance && instance.openStreams) {
		for (const [ id, stream ] of Object.entries(instance.openStreams)) {
			logger.info(context, 'Disconnecting stream', id)
			metrics.markStreamClosed(context, instance.table)
			await stream.close()
			Reflect.deleteProperty(instance.openStreams, id)
		}
	}

	/*
	 * 2. Close the master stream.
	 */
	if (instance) {
		await instance.close()
	}

	return null
}

exports.attach = async (context, instance, schema, options) => {
	/*
	 * Create a new emitter instance and register it in the
	 * list of open streams the instance keeps track of.
	 */
	const emitter = new EventEmitter()
	emitter.id = await uuid.random()
	instance.openStreams[emitter.id] = emitter

	logger.info(context, 'Opening stream', {
		table: instance.table,
		openStreams: Object.values(instance.openStreams).length
	})

	metrics.markStreamOpened(context, instance.table)

	const changeHandler = async (change) => {
		const {
			before,
			after
		} = change

		utils.convertDatesToISOString(before)
		utils.convertDatesToISOString(after)
		utils.removeVersionFields(before)
		utils.removeVersionFields(after)

		if (change.table !== instance.table) {
			return
		}

		// Store the result ids ahead of time, as the `filter()` call may remove the
		// id field from the result
		const afterId = after ? after.id : null
		const beforeId = before ? before.id : null

		let newMatch = filter(schema, after)
		let oldMatch = filter(schema, before)

		if (_.isEmpty(newMatch)) {
			newMatch = null
		}
		if (_.isEmpty(oldMatch)) {
			oldMatch = null
		}

		// Resolve any links queries
		// TODO: Refactor links in streams. This is tricky as the SQL stream
		// implementation can't resolve links for us, so we're forced to fetch links
		// "after the fact", this means that the link data attached to "oldMatch"
		// might not be accurate.
		// In addition to this, the async retrieval of links here means that events
		// can be emitted out of order. Utilising a queue system here should fix the
		// issue.
		if (schema.$$links && (newMatch || oldMatch)) {
			const id = afterId || beforeId

			metrics.markStreamLinkQuery(context, instance.table, change)

			const [ result ] = await options.query({
				$$links: schema.$$links,
				type: 'object',
				additionalProperties: true,
				properties: {
					id: {
						type: 'string',
						const: id
					}
				}
			}, {
				limit: 1
			})

			if (result) {
				if (newMatch) {
					newMatch.links = result.links
				}

				if (oldMatch) {
					oldMatch.links = result.links
				}
			} else {
				// If the link query didn't match anything, don't emit anything
				newMatch = null
				oldMatch = null
			}
		}

		if (newMatch || oldMatch) {
			emitter.emit('data', {
				type: change.type.toLowerCase(),
				before: oldMatch,
				after: newMatch
			})
		}
	}

	const errorHandler = (error) => {
		metrics.markStreamError(context, instance.table)
		emitter.emit('error', error)
	}

	instance.on('change', changeHandler)

	/*
	 * Propagate errors coming from the master stream.
	 */
	instance.on('error', errorHandler)

	emitter.close = async () => {
		logger.info(context, 'Closing stream', {
			table: instance.table,
			openStreams: Object.values(instance.openStreams).length
		})
		metrics.markStreamClosed(context, instance.table)

		/*
		 * Remove all the listeners we added.
		 */
		instance.removeListener('change', changeHandler)
		instance.removeListener('error', errorHandler)

		/*
		 * Delete the emitter from the set of open streams.
		 */
		Reflect.deleteProperty(instance.openStreams, emitter.id)

		/*
		 * Notify the client that the stream was successfully closed.
		 */
		emitter.emit('closed')
	}

	return emitter
}
