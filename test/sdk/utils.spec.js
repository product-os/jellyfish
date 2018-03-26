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

const ava = require('ava')
const utils = require('../../lib/sdk/utils')

ava.test('.isUUID() should return true given a uuid', (test) => {
	test.true(utils.isUUID('4a962ad9-20b5-4dd8-a707-bf819593cc84'))
})

ava.test('.isUUID() should return false given a non-uuid string', (test) => {
	test.false(utils.isUUID('foo'))
})

ava.test('.isUUID() should return false given a non-uuid string', (test) => {
	test.false(utils.isUUID('foo'))
})
