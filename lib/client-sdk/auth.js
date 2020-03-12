/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const uuid = require('uuid/v4')

/**
 * @namespace JellyfishSDK.auth
 */
class AuthSdk {
	constructor (sdk) {
		this.sdk = sdk
	}

	/**
     * @summary Get the currently authenticated user
     * @name whoami
     * @public
     * @function
     * @memberof JellyfishSDK.auth
     *
     * @description Gets the user card of the currently authorised user using
     * their auth token
     *
     * @fulfil {Object|null} - A single user card, or null if one wasn't found
     * @returns {Promise}
     *
     * @example
     * sdk.auth.whoami()
     * 	.then((user) => {
     * 		console.log(user)
     * 	})
     */
	async whoami () {
		return this.sdk.get('/whoami')
			.then((response) => {
				return response.data.data
			})
	}

	/**
     * @summary Create a new user account
     * @name signup
     * @public
     * @function
     * @memberof JellyfishSDK.auth
     *
     * @description Create a new user account and return the newly created user's
     * id
		 *
		 * @param {Object} user - The user object
		 * @param {String} user.username - The username
		 * @param {String} user.email - The users email address
		 * @param {String} user.password - The users password
     *
     * @fulfil {Object} - The newly created user
     * @returns {Promise}
     *
     * @example
     * sdk.auth.signup({
     * 	username: 'johndoe',
     * 	email: 'johndoe@example.com',
     * 	password: 'password123'
     * })
     * 	.then((id) => {
     * 		console.log(id)
     * 	})
     */
	signup ({
		username, email, password
	}) {
		return this.sdk.post('/signup', {
			email,
			username,
			password
		})
			.then((response) => {
				return response.data.data
			})
	}

	/**
	 * @summary Authenticate the SDK using a token
	 * @name loginWithToken
	 * @public
	 * @function
	 * @memberof JellyfishSDK.auth
	 *
	 * @description Authenticate the SDK using a token. The token is checked for
	 * validity and then saved using `jellyFishSdk.setAuthToken` to be used for
	 * later requests. Once logged in, there is no need to set the token again
	 *
	 * @returns {String} The new authentication token
	 *
	 * @param {String} token - Authentication token
	 *
	 * @example
	 * sdk.auth.loginWithToken('8b465c9a-b4cb-44c1-9df9-632649d7c4c3')
	 * 	.then(() => {
	 * 		console.log('Authenticated')
	 * 	})
	 */
	async loginWithToken (token) {
		// Set the auth token
		this.sdk.setAuthToken(token)

		// Try to refresh the session token, if it fails the token is invalid and
		// the internal token in SDK state should be set to null
		try {
			const newToken = await this.refreshToken()

			return newToken
		} catch (error) {
			this.sdk.setAuthToken(null)
			throw new Error(`Token is invalid: ${token}`)
		}
	}

	/**
	 * @summary Authenticate the SDK using a username and password
	 * @name login
	 * @public
	 * @function
	 * @memberof JellyfishSDK.auth
	 *
	 * @description Authenticate the SDK using a username and password. If the
	 * username and password are valid, a user session card will be returned.
	 * The id of the user session id (which is used to authenticate requests) is
	 * then saved using `jellyFishSdk.setAuthToken` to be used for later requests.
	 * Once logged in, there is no need to set the token again
	 *
	 * @param {Object} options - login data
	 * @param {String} options.username - Username
	 * @param {String} options.password - Password
	 *
	 * @returns {Object} The generated user session
	 *
	 * @example
	 * sdk.auth.login({
	 * 		username: 'johndoe',
	 * 		password: 'password123'
	 * 	})
	 * 	.then((session) => {
	 * 		console.log('Authenticated', session)
	 * 	})
	 */
	login (options) {
		// Normalize username to lower case
		const slug = `user-${options.username}`.toLowerCase()
		return this.sdk.action({
			card: slug,
			type: 'user',
			action: 'action-create-session@1.0.0',
			arguments: {
				password: options.password
			}
		})
			.then((session) => {
				this.sdk.setAuthToken(session.id)
				return session
			})
	}

	/**
	 * @summary Generate a new session token
	 * @name refreshToken
	 * @public
	 * @function
	 * @memberof JellyfishSDK.auth
	 *
	 * @description Refreshes the auth token used by the SDK
	 *
	 * @returns {String} The generated session token
	 *
	 * @example
	 * sdk.auth.refreshToken
	 * 	.then((token) => {
	 * 		console.log('New token', token)
	 * 	})
	 */
	refreshToken () {
		return this.whoami()
			.then((user) => {
				const expirationDate = new Date()
				expirationDate.setDate(expirationDate.getDate() + 7)

				return this.sdk.card.create({
					slug: `session-ui-${user.slug}-${Date.now()}-${uuid()}`,
					type: 'session',
					data: {
						actor: user.id,
						expiration: expirationDate.toISOString()
					}
				})
			})
			.then((session) => {
				this.sdk.setAuthToken(session.id)

				return session.id
			})
	}

	/**
     * @summary Logout
     * @name logout
     * @public
     * @function
     * @memberof JellyfishSDK.auth
     *
     * @description Logout, removing the current authToken and closing all
     * streams and network requests
     *
     * @example
     * sdk.auth.logout()
     */
	logout () {
		this.sdk.clearAuthToken()
		this.sdk.cancelAllRequests()
		this.sdk.cancelAllStreams()
	}
}
exports.AuthSdk = AuthSdk
