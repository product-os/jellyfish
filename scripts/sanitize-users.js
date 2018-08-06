#!/usr/bin/env node

const Promise = require('bluebird')
const _ = require('lodash')
const rethinkdb = require('rethinkdb')

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
	const connection = await rethinkdb.connect()

	const cursor = await rethinkdb.db('jellyfish')
		.table('cards')
		.filter({
			type: 'user'
		})
		.run(connection)

	const users = await cursor.toArray()

	console.log(`Sanitizing ${users.length} users`)

	await Promise.map(
		users,
		(user) => {
			if (_.includes(USER_BLACKLIST, user.slug)) {
				return null
			}

			return rethinkdb.db('jellyfish')
				.table('cards')
				.filter({
					slug: user.slug
				})
				.update({
					data: {
						email: `${user.slug}@example.com`,
						password: {
							hash: PASSWORD_HASH
						}
					}
				})
				.run(connection)
		},
		{
			concurrency: 10
		}
	)

	console.log('Done!')

	connection.close()
}

sanitize()
