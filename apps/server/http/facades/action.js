/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const logger = require('../../../../lib/logger').getLogger(__filename)
const uuid = require('../../../../lib/uuid')

module.exports = class ActionFacade {
	constructor (worker, queue, fileStore) {
		this.fileStore = fileStore
		this.queue = queue
		this.worker = worker
	}

	async processAction (context, sessionToken, action, options, ipAddress) {
		const files = []

		return uuid.random().then(async (id) => {
			if (options.files) {
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

			action.context = context

			const finalRequest = await this.worker.pre(sessionToken, action)
			return this.queue.enqueue(this.worker.getId(), sessionToken, finalRequest)
		}).then((actionRequest) => {
			return this.queue.waitResults(context, actionRequest)
		}).then(async (results) => {
			logger.info(context, 'Got action results', results)
			if (!results.error && options.files) {
				const cardId = results.data.id

				for (const item of files) {
					logger.info(context, 'Uploading attachment', {
						card: cardId,
						key: item.name
					})

					await this.fileStore.store(cardId, item.name, item.buffer)
				}
			}
			return results
		})
	}
}
