/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import sinon from 'sinon'
import {
	shallow,
	configure
} from 'enzyme'
import React from 'react'
import CardOwner from './CardOwner'
import Adapter from 'enzyme-adapter-react-16'

const browserEnv = require('browser-env')
browserEnv([ 'window', 'document', 'navigator' ])

configure({
	adapter: new Adapter()
})

const user = {
	name: 'User 1',
	slug: 'user1',
	type: 'user@1.0.0'
}

const types = [
	{
		name: 'user',
		slug: 'user'
	},
	{
		name: 'Support Thread',
		slug: 'support-thread'
	}
]

const card = {
	id: '1',
	slug: 'support-thread-1',
	type: 'support-thread@1.0.0'
}

const sandbox = sinon.createSandbox()

const getActions = () => {
	return {
		addNotification: sandbox.stub()
	}
}

const getSdk = (owner) => {
	return {
		event: {
			create: sandbox.fake.resolves({
				slug: 'new-event'
			})
		},
		card: {
			unlink: sandbox.fake.resolves(true),
			link: sandbox.fake.resolves({
				slug: 'new-link'
			}),
			getWithLinks: sandbox.fake.resolves({
				id: '1',
				links: {
					'is owned by': owner ? [
						owner
					] : []
				}
			})
		}
	}
}

ava.afterEach(async (test) => {
	sandbox.restore()
})

ava('CardOwner should render', (test) => {
	test.notThrows(() => {
		shallow(
			<CardOwner
				user={user}
				types={types}
				actions={getActions()}
				card={card}
				cardOwner={user}
				sdk={getSdk(user)}
			/>
		)
	})
})

ava('\'Assign to me\' is disabled if I am the owner', async (test) => {
	const cardOwner = await shallow(
		<CardOwner
			user={user}
			types={types}
			actions={getActions()}
			card={card}
			cardOwner={user}
			sdk={getSdk(user)}
		/>
	)
	cardOwner.update()
	test.true(cardOwner.find('[data-test="card-owner-menu__assign-to-me"]').props().disabled)
	test.false(cardOwner.find('[data-test="card-owner-menu__unassign"]').props().disabled)
})

ava('\'Unassign\' is disabled if there is no owner', async (test) => {
	const cardOwner = await shallow(
		<CardOwner
			user={user}
			types={types}
			actions={getActions()}
			card={card}
			cardOwner={null}
			sdk={getSdk()}
		/>
	)
	cardOwner.update()
	test.false(cardOwner.find('[data-test="card-owner-menu__assign-to-me"]').props().disabled)
	test.true(cardOwner.find('[data-test="card-owner-menu__unassign"]').props().disabled)
})
