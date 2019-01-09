const logger = require('../logger').getLogger(__filename)
const {
	createServer
} = require('./create-server')
const {
	reportException
} = require('./error-reporter')

const context = {
	id: 'SERVER'
}

createServer(context)
	.catch((error) => {
		logger.error(context, 'Server error', {
			error: {
				message: error.message,
				name: error.name,
				stack: error.stack
			}
		})

		reportException(error)
		throw error
	})
