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

const environment = require('../environment')

exports.getConfig = (options = {}) => {
	const config = environment.isProduction()
		? {
			port: process.env.PORT || 8000,
			dbPort: process.env.DB_PORT || 28015,
			dbHost: process.env.DB_HOST,
			dbUser: process.env.DB_USER,
			dbPassword: process.env.DB_PASSWORD,
			dbCert: process.env.DB_CERT,
			actionsUsername: process.env.ACTIONS_USERNAME,
			actionsPassword: process.env.ACTIONS_PASSWORD,
			actionsEmail: process.env.ACTIONS_EMAIL,
			minPoolElements: process.env.RETHINKDB_MIN_POOL_SIZE || 50,
			maxPoolElements: process.env.RETHINKDB_MAX_POOL_SIZE || 1000
		}
		: {
			port: options.port || 8000,
			dbPort: process.env.DB_PORT || 28015,
			dbHost: process.env.DB_HOST || 'localhost',
			dbUser: process.env.DB_USER || '',
			dbPassword: process.env.DB_PASSWORD || '',
			dbCert: null,
			actionsUsername: 'actions',
			actionsPassword: 'test',
			actionsEmail: 'accounts+jellyfish@resin.io',
			minPoolElements: process.env.RETHINKDB_MIN_POOL_SIZE || 50,
			maxPoolElements: process.env.RETHINKDB_MAX_POOL_SIZE || 1000
		}

	config.database = options.serverDatabase || process.env.SERVER_DATABASE || 'jellyfish'

	return config
}
