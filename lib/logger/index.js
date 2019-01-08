/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const _ = require('lodash')
const path = require('path')
const winston = require('winston')
const loggerContext = require('./context')
const environment = require('../environment')
const packageJSON = require('../../package.json')
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

	const loglevel = environment.isTest()
		? 'warn'
		: (config.logLevel[name] || environment.getLogLevel())
	const myFormat = winston.format.printf((info) => {
		const additionalArgs = info.additionalArgs
		const id = _.get(info, [ 'ctx', 'id' ], 'MISSING-TRANSACTION')

		let idField = `${id}`
		const workerid = _.get(info, [ 'ctx', 'workerid' ])
		if (!_.isNil(workerid)) {
			idField = `${idField} - ${workerid}`
		}

		const line = `(${packageJSON.version}) ${info.timestamp} [${name}] [${info.level}] [${idField}]: ${info.message}`
		if (!_.isEmpty(additionalArgs)) {
			return `${line} ${JSON.stringify(additionalArgs)}`
		}

		return line
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
