/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import '../../../../test/ui-setup'
import ava from 'ava'
import sinon from 'sinon'
import {
	shallow
} from 'enzyme'
import React from 'react'
import CardOwner from './CardOwner'

const user1 = {
	id: 1,
	name: 'User 1',
	slug: 'user1',
	type: 'user@1.0.0'
}

const user2 = {
	id: 2,
	name: 'User 2',
	slug: 'user2',
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
				user={user1}
				types={types}
				actions={getActions()}
				card={card}
				cardOwner={user1}
				sdk={getSdk(user1)}
			/>
		)
	})
})

ava('When I\'m the owner', (test) => {
	const cardOwner = shallow(
		<CardOwner
			user={user1}
			types={types}
			actions={getActions()}
			card={card}
			cardOwner={user1}
			sdk={getSdk(user1)}
		/>
	)
	cardOwner.update()

	test.is(
		shallow(cardOwner.props().label).text(),
		user1.name,
		'my name is displayed as a label'
	)

	test.false(
		cardOwner.find('[data-test="card-owner-menu__assign-to-me"]').exists(),
		'"Assign to me" menu item is not rendered'
	)

	test.true(
		cardOwner.find('[data-test="card-owner-menu__unassign"]').exists(),
		'"Unassign" menu item is displayed'
	)

	test.true(
		cardOwner.find('[data-test="card-owner-menu__assign"]').exists(),
		'"Assign to someone else" menu item is displayed'
	)
})

ava('If there is no owner', async (test) => {
	const cardOwner = await shallow(
		<CardOwner
			user={user1}
			types={types}
			actions={getActions()}
			card={card}
			cardOwner={null}
			sdk={getSdk()}
		/>
	)
	cardOwner.update()

	test.is(
		shallow(cardOwner.props().label).text(),
		'Assign to me',
		'"Assign to me" text is displayed as a label'
	)

	test.false(
		cardOwner.find('[data-test="card-owner-menu__assign-to-me"]').exists(),
		'"Assign to me" menu item is not rendered'
	)

	test.false(
		cardOwner.find('[data-test="card-owner-menu__unassign"]').exists(),
		'"Unassign" menu item is not rendered'
	)

	test.true(
		cardOwner.find('[data-test="card-owner-menu__assign"]').exists(),
		'"Assign to someone else" menu item is displayed'
	)
})

ava('If other user is an owner', async (test) => {
	const cardOwner = await shallow(
		<CardOwner
			user={user1}
			types={types}
			actions={getActions()}
			card={card}
			cardOwner={user2}
			sdk={getSdk(user2)}
		/>
	)
	cardOwner.update()

	test.is(
		shallow(cardOwner.props().label).text(),
		user2.name,
		'owner\'s name is displayed as a label'
	)

	test.true(
		cardOwner.find('[data-test="card-owner-menu__assign-to-me"]').exists(),
		'"Assign to me" menu item is displayed'
	)

	test.true(
		cardOwner.find('[data-test="card-owner-menu__unassign"]').exists(),
		'"Unassign" menu item is displayed'
	)

	test.true(
		cardOwner.find('[data-test="card-owner-menu__assign"]').exists(),
		'"Assign to someone else" menu item is displayed'
	)
})
