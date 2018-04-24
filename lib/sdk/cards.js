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

const path = require('path')

module.exports = [
	'action-create-card',
	'action-create-event',
	'action-request',
	'action-update-card',
	'action-upsert-card',
	'action',
	'card',
	'create',
	'event',
	'session',
	'type',
	'update',
	'user-admin',
	'user-guest',
	'user',
	'view-active',
	'view-read-user-admin',
	'view-read-user-default',
	'view-read-user-guest',
	'view-write-user-guest',
	'view'
].reduce((accumulator, slug) => {
	accumulator[slug] = require(path.join(path.resolve(__dirname, '..', '..', 'default-cards', 'core'), `${slug}.json`))
	return accumulator
}, {})
