/*
 * Copyright 2019 resin.io
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
const errio = require('errio')
const errorReporter = require('../error-reporter')
const logger = require('../logger').getLogger(__filename)

exports.onError = (context, title, error) => {
	// eslint-disable-next-line jellyfish/logger-string-expression
	logger.error(context, title, {
		error: errio.toObject(error, {
			stack: true
		})
	})

	errorReporter.reportException(context, error)
	throw error
}

exports.getContext = (prefix) => {
	return {
		id: `${prefix}-${randomstring.generate(20)}`
	}
}
