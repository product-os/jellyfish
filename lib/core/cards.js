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

const fs = require('fs')
const path = require('path')
const CARDS_DIRECTORY_PATH = path.join(path.resolve(__dirname, '..', '..', 'default-cards', 'build', 'core'))

module.exports = fs.readdirSync(CARDS_DIRECTORY_PATH).reduce((accumulator, card) => {
	accumulator[path.basename(card, path.extname(card))] = require(path.join(CARDS_DIRECTORY_PATH, card))
	return accumulator
}, {})
