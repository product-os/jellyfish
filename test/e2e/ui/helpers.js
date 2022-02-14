exports.createUser = async (sdk, user) => {
	const result = await sdk.action({
		card: 'user@1.0.0',
		type: 'type@1.0.0',
		action: 'action-create-user@1.0.0',
		arguments: {
			email: user.email,
			username: `user-${user.username}`,
			password: user.password
		}
	})

	return sdk.card.get(result.id)
}

exports.updateUser = async (sdk, userId, patch) => {
	await sdk.action({
		card: userId,
		type: 'user@1.0.0',
		action: 'action-update-card@1.0.0',
		arguments: {
			reason: 'for testing',
			patch
		}
	})
	return sdk.card.get(userId)
}

exports.addUserToBalenaOrg = async (sdk, userId) => {
	const userCard = await sdk.card.get(userId)
	const balenaOrgCard = await sdk.card.get('org-balena')
	await sdk.card.link(userCard, balenaOrgCard, 'is member of')
}
