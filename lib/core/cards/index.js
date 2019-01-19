/*
 * Copyright 2019 resin.io
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

module.exports = {
	'action-request': require('./action-request'),
	action: require('./action'),
	card: require('./card'),
	event: require('./event'),
	link: require('./link'),
	session: require('./session'),
	type: require('./type'),
	'user-admin': require('./user-admin'),
	user: require('./user'),
	'view-read-user-admin': require('./view-read-user-admin'),
	view: require('./view')
}
