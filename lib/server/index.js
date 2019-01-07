const logger = require('../logger').getLogger(__filename)
const {
	createServer
} = require('./create-server')
const {
	reportException
} = require('./error-reporter')

createServer()
	.catch((error) => {
		logger.error(logger.context.systemContext, 'Server error', {
			error: {
				message: error.message,
				name: error.name,
				stack: error.stack
			}
		})

		reportException(error)
		throw error
	})
