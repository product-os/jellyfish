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
const {
	loadCard
} = require('../card-loader')

// Dynamic requires messes up static analysis
module.exports = {
	'action-request': loadCard('default-cards/core/action-request.json'),
	action: loadCard('default-cards/core/action.json'),
	card: loadCard('default-cards/core/card.json'),
	event: loadCard('default-cards/core/event.json'),
	link: loadCard('default-cards/core/link.json'),
	session: loadCard('default-cards/core/session.json'),
	type: loadCard('default-cards/core/type.json'),
	'user-admin': loadCard('default-cards/core/user-admin.json'),
	user: loadCard('default-cards/core/user.json'),
	'view-read-user-admin': loadCard('default-cards/core/view-read-user-admin.json'),
	view: loadCard('default-cards/core/view.json')
}
