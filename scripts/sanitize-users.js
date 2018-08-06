#!/usr/bin/env node

/**
 * This script retrieves all user cards from a specified database and replaces
 * the email addresses and passwords with dummy values. The databse to sanitize
 * is specified using the `TARGET_DATABASE environment variable
 */

const Promise = require('bluebird')
const _ = require('lodash')
const createServer = require('../lib/server')

// Hashed password for string 'password'
const PASSWORD_HASH = 'd310765c8cdc225e0ed52624dc04445e0a72f21fc218ad1727fda09044eb4f4ff600876420ee4f81dfe46b1ee2e10b2571be5306ea1416abc1e1e30794ac6567'

// Ignore these users as modifying their email and password could be bad
const USER_BLACKLIST = [
	'user-admin',
	'user-guest',
	'user-actions'
]

// Sanitize email addresses and passwords for all users
const sanitize = async () => {
	if (!process.env.TARGET_DATABASE) {
		throw new Error('Please set the TARGET_DATABASE environment variable')
	}

	const dbName = process.env.TARGET_DATABASE

	process.env.SERVER_DATABASE = dbName

	console.log('Starting server')

	const {
		jellyfish
	} =	await createServer()

	const users = await jellyfish.query(jellyfish.sessions.admin, {
		type: 'object',
		properties: {
			type: {
				const: 'user'
			}
		},
		additionalProperties: true
	})

	console.log(`Sanitizing ${users.length} users`)

	await Promise.map(
		users,
		(user) => {
			if (_.includes(USER_BLACKLIST, user.slug)) {
				return null
			}

			if (_.get(user, [ 'data', 'email' ])) {
				user.data.email = `${user.slug}@example.com`
			}

			if (_.get(user, [ 'data', 'password', 'hash' ])) {
				user.data.password.hash = PASSWORD_HASH
			}

			return jellyfish.insertCard(jellyfish.sessions.admin, user, {
				override: true
			})
		},
		{
			concurrency: 10
		}
	)
	.catch((error) => {
		console.error(error)

		process.exit(1)
	})

	console.log('Done!')

	process.exit(0)
}

sanitize()
