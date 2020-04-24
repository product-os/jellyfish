/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const errio = require('errio')
const http = require('http')
const middlewares = require('./middlewares')
const routes = require('./routes')
const logger = require('../../../lib/logger').getLogger(__filename)
const metrics = require('../../../lib/metrics')

module.exports = (context, jellyfish, worker, producer, configuration, options) => {
	const application = metrics.initExpress(context)

	const server = http.Server(application)
	application.set('port', configuration.port)

	middlewares(context, application, jellyfish, {
		guestSession: options.guestSession
	})

	routes(application, jellyfish, worker, producer, {
		guestSession: options.guestSession
	})

	// We must define 4 arguments even if we don't use them
	// otherwise Express doesn't take it as an error handler.
	// See https://expressjs.com/en/guide/using-middleware.html
	application.use((error, request, response, next) => {
		if (error.type === 'entity.parse.failed') {
			return response.status(400).json({
				error: true,
				data: 'Invalid request body'
			})
		}

		// So we get more info about the error
		error.url = request.url
		error.method = request.method
		error.ip = request.ip
		error.headers = request.headers

		const errorObject = errio.toObject(error, {
			stack: true
		})

		logger.exception(request.context || context, 'Middleware error', error)
		return response.status(error.statusCode || 500).json({
			error: true,
			data: errorObject
		})
	})

	return {
		server,
		port: configuration.port,
		start: () => {
			return new Promise((resolve, reject) => {
				server.once('error', reject)

				// The .listen callback will be called regardless of if there is an
				// EADDRINUSE error, which means that the promise will resolve with
				// the incorrect port if the port is already in use. To get around
				// this, we add a listener for the `listening` event, which can be
				// removed if the port bind fails
				server.once('listening', () => {
					return resolve()
				})

				server.listen(application.get('port'))
			})
		},
		stop: async () => {
			await new Bluebird((resolve) => {
				server.close()
				server.once('close', resolve)
			})
		}
	}
}
