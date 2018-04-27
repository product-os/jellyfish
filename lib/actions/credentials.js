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

// Based on https://stackoverflow.com/a/17201493/1641422

const crypto = require('crypto')

const DEFAULT_ITERATIONS = 10000
const DEFAULT_KEY_LENGTH = 64
const DEFAULT_DIGEST = 'sha512'

/**
 * @summary Hash a password
 * @function
 * @public
 *
 * @param {String} password - password
 * @param {String} salt - salt
 * @returns {String} hash
 *
 * @example
 * const result = credentials.hash('foobarbaz', 'mysalt')
 */
exports.hash = (password, salt) => {
	const key = crypto.pbkdf2Sync(
		password,
		salt,
		DEFAULT_ITERATIONS,
		DEFAULT_KEY_LENGTH,
		DEFAULT_DIGEST)

	return key.toString('hex')
}

/**
 * @summary Check a password
 * @function
 * @public
 *
 * @param {String} password - password
 * @param {Object} options - options
 * @param {String} options.hash - hash
 * @param {String} options.salt - salt
 * @returns {Boolean} whether the password matches
 *
 * @example
 * const result = credentials.hash('foobarbaz')
 *
 * if (credentials.check('foobarbaz', result)) {
 *   console.log('This is a match!')
 * }
 */
exports.check = (password, options) => {
	return options.hash === exports.hash(password, options.salt)
}
