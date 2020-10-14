/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	getPromiseResolver,
	getWrapper
} from '../../../../../test/ui-setup'
import ava from 'ava'
import {
	mount
} from 'enzyme'
import sinon from 'sinon'
import React from 'react'
import {
	CreateLens
} from '../CreateLens'
import {
	contact, allTypes
} from '../../../../../test/unit/apps/ui/fixtures/types'

const sandbox = sinon.createSandbox()

const contactName = 'Contact A'

const createdCard = {
	id: 'C1',
	slug: 'contact-1',
	name: contactName,
	type: 'contact@1.0.0'
}

const account1 = {
	id: 'A1',
	slug: 'account-1',
	name: 'Account 1',
	type: 'account@1.0.0'
}

const account2 = {
	id: 'A2',
	slug: 'account-2',
	name: 'Account 2',
	type: 'account@1.0.0'
}

const user1 = {
	id: 'U1',
	slug: 'user-1',
	name: 'User 1',
	type: 'user@1.0.0'
}

const seed = {
	active: true,
	markers: [ 'org-balena' ],
	type: 'contact@1.0.0'
}

const createChannel = (card) => {
	return {
		data: {
			head: card
		}
	}
}

const wrappingComponent = getWrapper({
	core: {
		types: allTypes
	}
}).wrapper

const mountCreateLens = async (commonProps, card) => {
	return mount((
		<CreateLens {...commonProps} card={card} channel={createChannel(card)} />
	), {
		wrappingComponent
	})
}

const enterName = (component) => {
	const nameInput = component.find('input#root_name')
	nameInput.simulate('change', {
		target: {
			value: contactName
		}
	})
}

const submit = (component) => {
	const submitButton = component.find('button[data-test="card-creator__submit"]')
	submitButton.simulate('click')
}

ava.beforeEach(async (test) => {
	const onDonePromise = getPromiseResolver()
	test.context = {
		...test.context,
		onDonePromise,
		commonProps: {
			sdk: {
				card: {
					create: sandbox.stub().resolves(createdCard)
				}
			},
			allTypes,
			actions: {
				removeChannel: sandbox.stub().resolves(null),
				createLink: sandbox.stub().resolves(null),
				getLinks: sandbox.stub().resolves([]),
				queryAPI: sandbox.stub()
			}
		}
	}
})

ava.afterEach(async (test) => {
	sandbox.restore()
})

ava('CreateLens can create a new card', async (test) => {
	const {
		commonProps,
		onDonePromise
	} = test.context

	let callbackCard = null

	const card = {
		onDone: {
			action: 'open',
			callback: (newCard) => {
				callbackCard = newCard
				onDonePromise.resolver()
			}
		},
		seed,
		types: [ contact ]
	}

	const createLensComponent = await mountCreateLens(commonProps, card)
	enterName(createLensComponent)
	submit(createLensComponent)

	test.true(commonProps.sdk.card.create.calledOnce)
	test.true(commonProps.actions.createLink.notCalled)
	await onDonePromise.promise
	test.deepEqual(callbackCard, createdCard)
})

ava('CreateLens can link to multiple cards after creation', async (test) => {
	const {
		commonProps,
		onDonePromise
	} = test.context

	let callbackCard = null
	const targets = [ account1, account2 ]

	const card = {
		onDone: {
			action: 'link',
			targets,
			callback: (newCard) => {
				callbackCard = newCard
				onDonePromise.resolver()
			}
		},
		seed,
		types: [ contact ]
	}

	const createLensComponent = await mountCreateLens(commonProps, card)
	enterName(createLensComponent)
	submit(createLensComponent)

	await onDonePromise.promise
	test.true(commonProps.sdk.card.create.calledOnce)
	test.is(commonProps.actions.createLink.callCount, targets.length)
	test.true(commonProps.actions.removeChannel.calledOnce)
	test.deepEqual(callbackCard, createdCard)
})

ava.only('CreateLens throws exception if trying to link cards of different types', async (test) => {
	const {
		commonProps
	} = test.context

	// Note the targets are of different types
	const targets = [ account1, user1 ]

	const card = {
		onDone: {
			action: 'link',
			targets
		},
		seed,
		types: [ contact ]
	}

	await test.throwsAsync(async () => {
		await mountCreateLens(commonProps, card)
	}, {
		message: 'All target cards must be of the same type'
	})
})
