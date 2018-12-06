exports.getConfig = (options = {}) => {
	const config = process.env.NODE_ENV === 'production'
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
