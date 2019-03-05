
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
	if (actor) {
		name = actor.slug.replace('user-', '')
		email = actor.data.email
	} else {
		const account = _.find(accounts, {
			id
		})
		if (account) {
			name = `[${account.data.email}]`
			email = account.data.email
		}
	}
	return {
		name,
		email
	}
}
