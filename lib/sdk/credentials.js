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

const Bluebird = require('bluebird')
const crypto = require('crypto')

const DEFAULT_ITERATIONS = 10000
const DEFAULT_KEY_LENGTH = 64
const DEFAULT_DIGEST = 'sha512'

/**
 * @summary Hash a password string
 * @function
 * @private
 *
 * @param {String} password - password
 * @param {String} salt - salt
 * @returns {String} hash
 *
 * @example
 * const hash = hashPassword('foobarbaz', '...')
 */
const hashPassword = async (password, salt) => {
	const key = await Bluebird.fromCallback((callback) => {
		return crypto.pbkdf2(
			password,
			salt,
			DEFAULT_ITERATIONS,
			DEFAULT_KEY_LENGTH,
			DEFAULT_DIGEST,
			callback)
	})

	return key.toString('hex')
}

/**
 * @summary Hash a password
 * @function
 * @public
 *
 * @param {String} password - password
 * @returns {Object} result
 *
 * @example
 * const result = credentials.hash('foobarbaz')
 */
exports.hash = async (password) => {
	const salt = crypto
		.randomBytes(128)
		.toString('base64')

	const hash = await hashPassword(password, salt)

	return {
		salt,
		hash
	}
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
exports.check = async (password, options) => {
	return options.hash === await hashPassword(password, options.salt)
}
