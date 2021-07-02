/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const errio = require('errio')
const logger = require('@balena/jellyfish-logger').getLogger(__filename)
const {
	v4: uuidv4
} = require('uuid')

module.exports = class ActionFacade {
	constructor (worker, producer, fileStore) {
		this.fileStore = fileStore
		this.producer = producer
		this.worker = worker
	}

	async processAction (context, sessionToken, action, options = {}) {
		action.context = context
		const files = []

		if (options.files) {
			const id = uuidv4()

			// Upload magic
			options.files.forEach((file) => {
				const name = `${id}.${file.originalname}`

				_.set(action.arguments.payload, file.fieldname, {
					name: file.originalname,
					slug: name,
					mime: file.mimetype,
					bytesize: file.buffer.byteLength
				})

				files.push({
					buffer: file.buffer,
					name
				})
			})
		}

		const finalRequest = await this.worker.pre(sessionToken, action)
		const actionRequest = await this.producer.enqueue(this.worker.getId(), sessionToken, finalRequest)

		const results = await this.producer.waitResults(context, actionRequest)
		logger.info(context, 'Got action results', results)

		if (results.error) {
			throw errio.fromObject(results.data)
		}

		if (options.files) {
			const cardId = results.data.id

			for (const item of files) {
				logger.info(context, 'Uploading attachment', {
					card: cardId,
					key: item.name
				})

				await this.fileStore.store(context, cardId, item.name, item.buffer)
			}
		}

		return results.data
	}
}
