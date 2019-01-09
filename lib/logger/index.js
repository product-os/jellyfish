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

const path = require('path')
const _ = require('lodash')
const winston = require('winston')
const environment = require('../environment')
const packageJSON = require('../../package.json')
const BASE_PATH = path.join(__dirname, '..', '..')

// Adds winston.transports.Logentries
require('le_node')

class Logger {
	constructor (level, filename, transport) {
		const moduleName = path
			.relative(BASE_PATH, filename)
			.split(path.sep)
			.slice(1)
			.join(path.sep)

		this.namespace = path.join(
			path.dirname(moduleName),
			path.basename(moduleName, path.extname(moduleName)))

		this.logger = winston.createLogger({
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
		this.logger.debug(message, {
			namespace: this.namespace,
			version: packageJSON.version,
			context,
			data
		})
	}

	error (context, message, data) {
		this.logger.error(message, {
			namespace: this.namespace,
			version: packageJSON.version,
			context,
			data
		})
	}

	warn (context, message, data) {
		this.logger.warn(message, {
			namespace: this.namespace,
			version: packageJSON.version,
			context,
			data
		})
	}

	info (context, message, data) {
		this.logger.info(message, {
			namespace: this.namespace,
			version: packageJSON.version,
			context,
			data
		})
	}
}

module.exports.getLogger = _.memoize((filename) => {
	const transport = environment.isProduction() && process.env.LOGENTRIES_TOKEN
		? new winston.transports.Logentries({
			token: process.env.LOGENTRIES_TOKEN
		})
		: new winston.transports.Console({
			format: winston.format.combine(
				winston.format.colorize(),
				winston.format.printf((info) => {
					const context = info.context || {}
					const transaction = context.id || 'MISSING-TRANSACTION'
					const id = context.workerid ? `${transaction} - ${context.workerid}` : transaction
					const prefix = `(${info.version}) ${info.timestamp} [${info.namespace}] [${info.level}] [${id}]:`
					if (info.data) {
						return `${prefix} ${info.message} ${JSON.stringify(info.data)}`
					}

					return `${prefix} ${info.message}`
				}))
		})

	return new Logger(environment.getLogLevel(), filename, transport)
})
