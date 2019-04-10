/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const skhema = require('skhema')
const EventEmitter = require('events').EventEmitter
const PGLiveSelect = require('./pg-live-select')
const logger = require('../../../../logger').getLogger(__filename)
const uuid = require('../../../../uuid')

const LINK_KEY = '$$links'

const filter = (schema, element) => {
	const result = skhema.filter(schema, element)

	// If additionalProperties is false, remove properties that haven't been
	// explicitly selected. This is done because the Skhema module will merge
	// anyOf branches into the top level properties before applying the filter
	// (which is correct) however, due to the Jellyfish permissions system,
	// properties may be added to the result that the initial query did not
	// specify, depending on which permission views are merged in.
	if (schema.additionalProperties === false) {
		for (const item of _.castArray(element)) {
			for (const key in item) {
				if (!schema.properties[key]) {
					Reflect.deleteProperty(item, key)
				}
			}
		}
	}

	return result
}

const resolveLinks = async (context, subqueryFn, schema, options, card, links) => {
	const result = await links.evaluateCard({
		getElementsById: (ids, subqueryOptions) => {
			if (options.subquery) {
				return options.subquery(context, ids, subqueryOptions)
			}

			return subqueryFn(context, ids, subqueryOptions)
		}
	}, card, schema[LINK_KEY] || {})
	if (!result) {
		return null
	}

	if (!_.isEmpty(result)) {
		// Object.assign is used so that only resolved verbs are modified
		Object.assign(card.links, result)
	}

	return card
}

exports.setup = async (context, connection, table) => {
	const sco = await connection.connect()
	const lq = new PGLiveSelect(sco.client, `megatream-${table}`, table)
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
	 * list of opens stream the instance keeps track of.
	 */
	const emitter = new EventEmitter()
	emitter.id = await uuid()
	instance.openStreams[emitter.id] = emitter

	logger.info(context, 'Opening stream', {
		table: instance.table,
		openStreams: Object.values(instance.openStreams).length
	})

	const changeHandler = async (change) => {
		const {
			before,
			after
		} = change

		if (change.table !== instance.table) {
			return
		}

		let newMatch = filter(schema, _.clone(after))
		let oldMatch = filter(schema, _.clone(before))

		if (_.isEmpty(newMatch)) {
			newMatch = null
		}
		if (_.isEmpty(oldMatch)) {
			oldMatch = null
		}

		if (newMatch) {
			newMatch = await resolveLinks(
				context, options.subquery, schema, {}, newMatch, options.links)
		}

		if (oldMatch) {
			oldMatch = await resolveLinks(
				context, options.subquery, schema, {}, oldMatch, options.links)
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
