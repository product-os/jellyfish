/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const typedErrors = require('typed-errors')
const errio = require('errio')
const path = require('path')
const _ = require('lodash')
const winston = require('winston')
const errorReporter = require('./error-reporter')
const environment = require('../environment')
const assert = require('../assert')
const packageJSON = require('../../package.json')
const BASE_PATH = path.join(__dirname, '..', '..')

// Adds winston.transports.Logentries
require('le_node')

const LoggerNoContext = typedErrors.makeTypedError('LoggerNoContext')
const LEVELS = winston.config.syslog.levels

class Logger {
	constructor (level, filename, transport) {
		this.level = level

		const moduleName = path
			.relative(BASE_PATH, filename)
			.split(path.sep)
			.slice(1)
			.join(path.sep)

		this.namespace = path.join(
			path.dirname(moduleName),
			path.basename(moduleName, path.extname(moduleName)))

		this.logger = winston.createLogger({
			levels: winston.config.syslog.levels,
			format: winston.format.combine(
				winston.format.timestamp(),
				winston.format.json()),
			transports: [ transport ],
			exceptionHandlers: [ transport ],
			exitOnError: false,
			level
		})
	}

	debug (context, message, data) {
		if (LEVELS[this.level] < LEVELS.debug) {
			return
		}

		this.logger.log('debug', message, {
			namespace: this.namespace,
			version: packageJSON.version,
			context,
			data
		})
	}

	error (context, message, data) {
		if (LEVELS[this.level] < LEVELS.crit) {
			return
		}

		this.logger.log('crit', message, {
			namespace: this.namespace,
			version: packageJSON.version,
			context,
			data
		})
	}

	warn (context, message, data) {
		if (LEVELS[this.level] < LEVELS.warning) {
			return
		}

		this.logger.log('warning', message, {
			namespace: this.namespace,
			version: packageJSON.version,
			context,
			data
		})
	}

	info (context, message, data) {
		if (LEVELS[this.level] < LEVELS.info) {
			return
		}

		this.logger.log('info', message, {
			namespace: this.namespace,
			version: packageJSON.version,
			context,
			data
		})
	}

	exception (context, message, error) {
		assert.INTERNAL(context, _.isError(error), Error, () => {
			return [
				'Last argument to .exception() should be an error:',
				JSON.stringify(error, null, 2)
			].join(' ')
		})

		const errorObject = errio.toObject(error, {
			stack: true
		})

		this.error(context, message, errorObject)
		errorReporter.reportException(context, error)
	}
}

const newTransport = () => {
	if (environment.isProduction() && environment.logentries.token) {
		return new winston.transports.Logentries({
			token: environment.logentries.token
		})
	}

	return new winston.transports.Console({
		format: winston.format.combine(
			winston.format.colorize(),
			winston.format.printf((info) => {
				assert.INTERNAL(null, info.context && info.context.id,
					LoggerNoContext, () => {
						return `Missing context: ${JSON.stringify(info)}`
					})

				const id = info.context.id
				const prefix = `(${info.version}) ${info.timestamp} [${info.namespace}] [${info.level}] [${id}]:`
				if (info.data) {
					return `${prefix} ${info.message} ${JSON.stringify(info.data)}`
				}

				return `${prefix} ${info.message}`
			}))
	})
}

const transport = newTransport()
const logLevel = environment.logger.loglevel || 'debug'

module.exports.getLogger = _.memoize((filename) => {
	return new Logger(logLevel, filename, transport)
})
