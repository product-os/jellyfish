/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Kernel = require('../../lib/core/kernel')
const actionLibrary = require('../../lib/action-library')

const createKernel = async ({
	backend,
	context
}) => {
	const kernel = new Kernel(backend)
	await kernel.initialize(context)

	const adminSession = kernel.sessions.admin
	const session = await kernel.getCardById(
		context, adminSession, adminSession)
	const actor = await kernel.getCardById(
		context, adminSession, session.data.actor)

	await kernel.insertCard(context, adminSession,
		require('../../apps/server/default-cards/contrib/message.json'))
	await kernel.insertCard(context, adminSession,
		require('../../apps/server/default-cards/contrib/role-user-community.json'))
	await kernel.insertCard(context, adminSession,
		require('../../apps/server/default-cards/contrib/external-event.json'))
	await kernel.insertCard(context, adminSession,
		require('../../apps/server/default-cards/contrib/issue.json'))
	await kernel.insertCard(context, adminSession,
		require('../../apps/server/default-cards/contrib/pull-request.json'))
	await kernel.insertCard(context, adminSession,
		require('../../apps/server/default-cards/contrib/email-sequence.json'))
	await kernel.insertCard(context, adminSession,
		require('../../apps/server/default-cards/contrib/repository.json'))
	await kernel.insertCard(context, adminSession,
		require('../../apps/server/default-cards/contrib/push.json'))
	await kernel.insertCard(context, adminSession,
		require('../../apps/server/default-cards/contrib/support-thread.json'))
	await kernel.insertCard(context, adminSession,
		require('../../apps/server/default-cards/contrib/sales-thread.json'))
	await kernel.insertCard(context, adminSession,
		require('../../apps/server/default-cards/contrib/thread.json'))
	await kernel.insertCard(context, adminSession,
		require('../../apps/server/default-cards/contrib/whisper.json'))

	await kernel.insertCard(context, adminSession,
		actionLibrary['action-create-card'].card)
	await kernel.insertCard(context, adminSession,
		actionLibrary['action-create-event'].card)
	await kernel.insertCard(context, adminSession,
		actionLibrary['action-set-add'].card)
	await kernel.insertCard(context, adminSession,
		actionLibrary['action-create-user'].card)
	await kernel.insertCard(context, adminSession,
		actionLibrary['action-create-session'].card)
	await kernel.insertCard(context, adminSession,
		actionLibrary['action-update-card'].card)
	await kernel.insertCard(context, adminSession,
		actionLibrary['action-delete-card'].card)

	return {
		kernel,
		actor,
		session: adminSession
	}
}

export {
	createKernel
}
