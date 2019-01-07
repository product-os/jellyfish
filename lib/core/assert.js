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
const assert = require('assert')
const environment = require('../environment')

// This will be evaluated once, and then
// cached by the module system, so future
// requires won't have to do this check

if (environment.isProduction()) {
	for (const fn of Object.keys(assert)) {
		exports[fn] = _.noop
	}
} else {
	module.exports = assert
}
