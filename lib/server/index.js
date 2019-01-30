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

const randomstring = require('randomstring')
const logger = require('../logger').getLogger(__filename)
const bootstrap = require('./bootstrap')

const context = {
	id: `SERVER-${randomstring.generate(20)}`
}

const startDate = new Date()
logger.info(context, 'Starting server', {
	time: startDate.getTime()
})

bootstrap(context).then((server) => {
	const endDate = new Date()
	const timeToStart = endDate.getTime() - startDate.getTime()

	logger.info(context, 'Server started', {
		time: timeToStart,
		port: server.port
	})

	if (timeToStart > 10000) {
		logger.warn(context, 'Slow server startup time', {
			time: timeToStart
		})
	}
}).catch((error) => {
	logger.exception(context, 'Server error', error)
	setTimeout(() => {
		process.exit(1)
	}, 5000)
})
