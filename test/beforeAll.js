const helpers = require('./helpers')
const actionLibrary = require('../lib/action-library')

const before = async (t) => {
	const suffix = uuid()
	const dbName = `test_${suffix.replace(/-/g, '_')}`
	const testId = `CORE-TEST-${uuid()}`
	const context = { id: testId }

	const cache = await helpers.createCache({ dbName, context })
	const backend = await helpers.createBackend({ options, cache, dbName, context })
	const kernel = await createKernel(backend)

	const session = kernel.sessions.admin

	const session = await kernel.getCardById(
		context, session, session)

	const actor = await kernel.getCardById(
		context, session, session.data.actor)

	await kernel.insertCard(context, session,
		require('../apps/server/default-cards/contrib/message.json'))
	await kernel.insertCard(context, session,
		require('../apps/server/default-cards/contrib/role-user-community.json'))

	await kernel.insertCard(context, session,
		actionLibrary['action-create-card'].card)
	await kernel.insertCard(context, session,
		actionLibrary['action-create-event'].card)
	await kernel.insertCard(context, session,
		actionLibrary['action-set-add'].card)
	await kernel.insertCard(context, session,
		actionLibrary['action-create-user'].card)
	await kernel.insertCard(context, session,
		actionLibrary['action-create-session'].card)
	await kernel.insertCard(context, session,
		actionLibrary['action-update-card'].card)
	await kernel.insertCard(context, session,
		actionLibrary['action-delete-card'].card)

	const queue = helpers.createQueue({ context, kernel, session, options })

	await kernel.insertCard(context, session, require('../lib/worker/cards/update'))
	await kernel.insertCard(context, session, require('../lib/worker/cards/create'))
	await kernel.insertCard(context, session, require('../lib/worker/cards/triggered-action'))

	const worker = createWorker({ kernel, session, queue })

	const sdk = getTestSdk()

	t.context = {
		kernel,
		worker,
		queue,
		sdk,
		backend,
		context,
		cache,
		session,
		actor,
		dequeue: helpers.dequeue
	}
}

export default before
