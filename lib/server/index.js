const logger = require('../logger').getLogger(__filename)
const {
	createServer
} = require('./create-server')
const {
	reportException
} = require('./error-reporter')

const ctx = logger.create('server')
createServer({
	ctx
})
	.catch((error) => {
		logger.error(ctx, 'Server error', {
			error
		})

		reportException(error)
		throw error
	})
