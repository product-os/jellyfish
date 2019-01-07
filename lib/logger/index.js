const _ = require('lodash')
const path = require('path')
const winston = require('winston')
const loggerContext = require('./context')
const BASE_PATH = path.join(__dirname, '..', '..')

const config = {
	logLevel: {}
}

const {
	combine,
	timestamp
} = winston.format

class LogWrapper {
	constructor (logger) {
		this.logger = logger
	}

	debug (context, message, ...data) {
		this.logger.debug({
			message,
			ctx: context,
			additionalArgs: data
		})
	}

	error (context, message, ...data) {
		this.logger.error({
			message,
			ctx: context,
			additionalArgs: data
		})
	}

	warn (context, message, ...data) {
		this.logger.warn({
			message,
			ctx: context,
			additionalArgs: data
		})
	}

	info (context, message, ...data) {
		this.logger.info({
			message,
			ctx: context,
			additionalArgs: data
		})
	}

	verbose (context, message, ...data) {
		this.logger.verbose({
			message,
			ctx: context,
			additionalArgs: data
		})
	}

	silly (context, message, ...data) {
		this.logger.silly({
			message,
			ctx: context,
			additionalArgs: data
		})
	}
}

module.exports.context = loggerContext

module.exports.getLogger = _.memoize((filename) => {
	const name = path
		.relative(BASE_PATH, filename)
		.split(path.sep)
		.slice(1)
		.join(path.sep)

	const loglevel = process.env.CI || process.env.AVA_PATH
		? 'warn'
		: (config.logLevel[name] || process.env.LOGLEVEL || 'debug')
	const myFormat = winston.format.printf((info) => {
		const additionalArgs = info.additionalArgs
		const id = _.get(info, [ 'ctx', 'id' ], 'MISSING-TRANSACTION')

		let idField = `${id}`
		const workerid = _.get(info, [ 'ctx', 'workerid' ])
		if (!_.isNil(workerid)) {
			idField = `${idField} - ${workerid}`
		}

		if (_.isEmpty(additionalArgs)) {
			return `${info.timestamp} [${name}] [${info.level}] [${idField}]: ${info.message}`
		}
		return `${info.timestamp} [${name}] [${info.level}] [${idField}]: ${info.message} ${JSON.stringify(additionalArgs)}`
	})

	const instance = new LogWrapper(winston.createLogger({
		format: combine(
			winston.format.colorize(),
			timestamp(),
			myFormat
		),
		transports: [
			new winston.transports.Console()
		],
		exceptionHandlers: [
			new winston.transports.Console()
		],
		exitOnError: false,
		level: loglevel
	}))

	instance.context = loggerContext
	return instance
})
