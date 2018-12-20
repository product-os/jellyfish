const logger = require('../logger').getLogger('server:index')
const ctx = require('../logger/context')
const {
	createServer
} = require('./create-server')
const {
	reportException
} = require('./error-reporter')

createServer()
	.catch((error) => {
		logger.error(ctx, 'Server error', {
			error
		})

		reportException(error)
		throw error
	})
