#!/usr/bin/env node

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const uuid = require('uuid/v4')
const bootstrap = require('../../apps/server/bootstrap')
const actionServer = require('../../apps/action-server/bootstrap')

const workerOptions = {
	onError: (context, error) => {
		throw error
	}
}

const run = async () => {
	const username = process.env.USERNAME || 'testuser'
	const password = 'password'
	const email = `${username}@example.com`

	const userDetails = {
		username,
		email,
		password
	}

	const context = {
		id: `SERVER-TEST-${uuid()}`
	}

	const server = await bootstrap(context)
	const tickWorker = await actionServer.tick(context, workerOptions)
	const actionWorker1 = await actionServer.worker(context, workerOptions)
	const actionWorker2 = await actionServer.worker(context, workerOptions)

	const jellyfish = server.jellyfish
	const queue = server.queue
	const session = jellyfish.sessions.admin

	const addUserToBalenaOrg = async (userId) => {
		const balenaOrgCard = await jellyfish.getCardBySlug(
			context, session, 'org-balena', {
				type: 'org'
			})

		// Add the community user to the balena org
		await jellyfish.insertCard(
			context,
			session,
			{
				type: 'link',
				name: 'has member',
				slug: `link-${balenaOrgCard.id}--${userId}`,
				data: {
					from: {
						id: balenaOrgCard.id,
						type: balenaOrgCard.type
					},
					to: {
						id: userId,
						type: 'user'
					},
					inverseName: 'is member of'
				}
			}
		)
	}

	const createUser = async (user) => {
		const action = await server.worker.pre(session, {
			card: 'user',
			type: 'type',
			action: 'action-create-user',
			arguments: {
				email: user.email,
				username: `user-${user.username}`,
				password: {
					string: user.password,
					salt: `user-${user.username}`
				}
			},
			context
		})

		const results = await queue.enqueue(
			server.worker.getId(),
			session, action
		).then((actionRequest) => {
			return queue.waitResults({}, actionRequest)
		})

		if (results.error) {
			throw new Error(results.data.message)
		}

		return jellyfish.getCardById(
			context, session, results.data.id, {
				type: results.data.type
			})
	}

	const userCard = await createUser(userDetails)
	await addUserToBalenaOrg(userCard.id)

	await actionWorker2.stop()
	await actionWorker1.stop()
	await tickWorker.stop()
	await server.close()

	return userCard
}

run()
	.then((user) => {
		console.log(`Successfully created new user: ${user.slug}`)
		process.exit(0)
	})
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
