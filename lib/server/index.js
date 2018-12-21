const logger = require('../logger').getLogger(__filename)
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
			error: {
				message: error.message,
				name: error.name,
				stack: error.stack
			}
		})

		reportException(error)
		throw error
	})
