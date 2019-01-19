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

module.exports = {
	slug: 'user-admin',
	type: 'user',
	version: '1.0.0',
	name: 'The admin user',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		disallowLogin: true,
		email: 'accounts+jellyfish@resin.io',
		roles: []
	},
	requires: [],
	capabilities: []
}
