const {
	createServer
} = require('./create-server')
const {
	reportException
} = require('./error-reporter')

createServer()
	.catch((error) => {
		reportException(error)
		throw error
	})
