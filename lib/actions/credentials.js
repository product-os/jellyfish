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

const bcrypt = require('bcrypt')
const SALT_ROUNDS = 10

/**
 * @summary Hash a password
 * @function
 * @public
 *
 * @param {String} password - password
 * @returns {String} hash
 *
 * @example
 * const result = credentials.hash('foobarbaz')
 */
exports.hash = (password) => {
	return bcrypt.hashSync(password, SALT_ROUNDS)
}

/**
 * @summary Check a password
 * @function
 * @public
 *
 * @param {String} password - password
 * @param {String} hash - hash
 * @returns {Boolean} whether the password matches
 *
 * @example
 * const hash = credentials.hash('foobarbaz')
 *
 * if (credentials.check('foobarbaz', hash)) {
 *   console.log('This is a match!')
 * }
 */
exports.check = (password, hash) => {
	return bcrypt.compareSync(password, hash)
}
