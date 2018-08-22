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

const augmentOptions = (options = {}) => {
	options.customFormats = {
		markdown: _.isString,
		mermaid: _.isString
	}

	// The regexp keyword is used by rendition to do case insensitive pattern
	// matching via the AJV package.
	// See https://github.com/epoberezkin/ajv-keywords#regexp
	options.keywords = [ 'regexp' ]

	return options
}

module.exports = {
	validate: (schema, object, options) => {
		return skhema.validate(schema, object, augmentOptions(options))
	},
	filter: (schema, object, options) => {
		return skhema.filter(schema, object, augmentOptions(options))
	},
	isValid: (schema, object, options) => {
		return skhema.isValid(schema, object, augmentOptions(options))
	},
	match: (schema, object, options) => {
		return skhema.match(schema, object, augmentOptions(options))
	},
	merge: skhema.merge
}
