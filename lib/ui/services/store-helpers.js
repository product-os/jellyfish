
/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
const _ = require('lodash')
const core = require('../core')
const store = require('../core/store')

exports.getActor = (id) => {
	const state = core.store.getState()
	const allUsers = store.selectors.getAllUsers(state)
	const accounts = store.selectors.getAccounts(state)
	const actor = _.find(allUsers, {
		id
	})
	let name = 'unknown user'
	let email = null

	// IF proxy is true, it indicates that the actor has been created as a proxy
	// for a real user in JF, usually as a result of syncing from an external
	// service
	let proxy = false

	if (actor) {
		name = actor.slug.replace('user-', '')
		email = actor.data.email
	} else {
		const account = _.find(accounts, {
			id
		})
		if (account) {
			proxy = true
			const handle = account.data.handle ||
				account.data.email ||
				account.slug.replace(/^account-/, '')
			name = `[${handle}]`
			email = account.data.email
		}
	}
	return {
		name,
		email,
		proxy
	}
}
