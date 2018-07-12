exports.getConfig = () => {
	const config = process.env.NODE_ENV === 'production'
		? {
			port: process.env.PORT,
			dbPort: process.env.DB_PORT,
			dbHost: process.env.DB_HOST,
			dbUser: process.env.DB_USER,
			dbPassword: process.env.DB_PASSWORD,
			dbCert: process.env.DB_CERT,
			actionsUsername: process.env.ACTIONS_USERNAME,
			actionsPassword: process.env.ACTIONS_PASSWORD,
			actionsEmail: process.env.ACTIONS_EMAIL
		}
		: {
			port: 8000,
			dbPort: 28015,
			dbHost: 'localhost',
			dbUser: '',
			dbPassword: '',
			dbCert: null,
			actionsUsername: 'actions',
			actionsPassword: 'test',
			actionsEmail: 'accounts+jellyfish@resin.io'
		}

	config.database = process.env.SERVER_DATABASE || 'jellyfish'

	return config
}
