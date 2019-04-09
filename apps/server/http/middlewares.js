/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const bodyParser = require('body-parser')
const responseTime = require('response-time')
const logger = require('../../../lib/logger').getLogger(__filename)
const uuid = require('../../../lib/uuid')

module.exports = (rootContext, application, jellyfish, options) => {
	application.use(bodyParser.json({
		// A small trick to preserve the unparsed JSON
		verify: (request, response, buffer, encoding) => {
			request.rawBody = buffer.toString('utf8')
		}
	}))

	application.use((request, response, next) => {
		response.header('Access-Control-Allow-Origin', '*')
		response.header('Access-Control-Allow-Headers', [
			'Accept',
			'Authorization',
			'Content-Type',
			'Origin',
			'X-Requested-With'
		].join(', '))
		response.header('Access-Control-Allow-Methods', [
			'DELETE',
			'GET',
			'HEAD',
			'OPTIONS',
			'PATCH',
			'POST',
			'PUT'
		].join(', '))

		return next()
	})

	application.use((request, response, next) => {
		uuid().then((id) => {
			const context = {
				id: `REQUEST-${id}`,
				api: rootContext.id
			}

			logger.info(context, 'HTTP request start', {
				uri: request.originalUrl
			})

			request.context = context
			return next()
		}).catch(next)
	})

	application.use(responseTime((request, response, time) => {
		logger.info(request.context, 'HTTP request end', {
			uri: request.originalUrl,
			time
		})

		if (time > 5000) {
			logger.info(request.context, 'Slow HTTP request', {
				uri: request.originalUrl,
				payload: request.payload,
				time
			})
		}
	}))

	application.use((request, response, next) => {
		const authorization = request.headers.authorization
		const token = _.last(_.split(authorization, ' '))
		request.sessionToken = token || options.guestSession
		return next()
	})
}
