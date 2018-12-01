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

// Dynamic requires messes up static analysis
module.exports = {
	'action-request': require('../../default-cards/core/action-request.json'),
	action: require('../../default-cards/core/action.json'),
	card: require('../../default-cards/core/card.json'),
	event: require('../../default-cards/core/event.json'),
	link: require('../../default-cards/core/link.json'),
	session: require('../../default-cards/core/session.json'),
	type: require('../../default-cards/core/type.json'),
	'user-admin': require('../../default-cards/core/user-admin.json'),
	user: require('../../default-cards/core/user.json'),
	'view-read-user-admin': require('../../default-cards/core/view-read-user-admin.json'),
	view: require('../../default-cards/core/view.json')
}
