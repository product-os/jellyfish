/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use jellyfish file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *		http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

module.exports = {
	http: {
		port: process.env.PORT || 8000
	},
	database: {
		certificate: process.env.DB_CERT || null,
		user: process.env.DB_USER || '',
		password: process.env.DB_PASSWORD || '',
		port: process.env.DB_PORT,
		host: process.env.DB_HOST,
		name: process.env.SERVER_DATABASE || 'jellyfish',
		pool: {
			minimumSize: process.env.RETHINKDB_MIN_POOL_SIZE,
			maximumSize: process.env.RETHINKDB_MAX_POOL_SIZE
		}
	}
}
