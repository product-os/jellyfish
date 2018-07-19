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
const skhema = require('skhema')
const errors = require('./core/errors')

skhema.SchemaMismatch = errors.JellyfishSchemaMismatch

const addFormats = (options = {}) => {
	options.customFormats = {
		markdown: _.isString,
		mermaid: _.isString
	}

	return options
}

module.exports = {
	validate: (schema, object, options) => {
		return skhema.validate(schema, object, addFormats(options))
	},
	filter: (schema, object, options) => {
		return skhema.filter(schema, object, addFormats(options))
	},
	isValid: (schema, object, options) => {
		return skhema.isValid(schema, object, addFormats(options))
	},
	match: (schema, object, options) => {
		return skhema.match(schema, object, addFormats(options))
	},
	merge: skhema.merge
}
