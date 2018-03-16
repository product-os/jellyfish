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
const fs = require('fs')
const path = require('path')

const CARDS_BASE_DIRECTORY = path.resolve(__dirname, '..', '..', 'default-cards')
const CARDS_BUCKETS = [ 'core', 'essential', 'contrib' ]

module.exports = _.reduce(CARDS_BUCKETS, (accumulator, bucket) => {
	for (const card of fs.readdirSync(path.join(CARDS_BASE_DIRECTORY, bucket))) {
		_.set(accumulator, [
			bucket,
			path.basename(card, path.extname(card))
		], require(path.join(CARDS_BASE_DIRECTORY, bucket, card)))
	}

	return accumulator
}, {})
